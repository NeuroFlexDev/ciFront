import {StrictMode} from 'react';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import IntegrationsPage from '@/Pages/Integrations/IntegrationsPage';
import AuthPage from '@/Pages/AuthPage/AuthPage';
import {amountMinor} from '@/Pages/Billing/billingUtils';
import {readDraft,setDraftOwner} from '@/shared/drafts';
import {LocaleProvider} from '@/i18n/LocaleContext';
import {useLocale} from '@/i18n/useLocale';
import {integrationsEnglish} from '@/i18n/integrations';

const mock=vi.hoisted(()=>({user:{id:800,email:'owner@example.org',organization_id:12,organization_role:'owner'},completeAuthentication:vi.fn(),login:vi.fn()}));
vi.mock('@/auth/useAuth',()=>({useAuth:()=>({...mock,isAuthenticated:false,isLoading:false})}));
vi.mock('@/Components/Menu/Menu',()=>({default:()=>null}));
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
beforeEach(()=>{mock.user.id++;mock.user.organization_role='owner';setDraftOwner(mock.user.id);});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();vi.clearAllMocks();localStorage.clear();sessionStorage.clear();window.history.replaceState({},'','/');});

it('preserves a connector draft after a failed save and never stores the returned key',async()=>{
 let fail=true;
 vi.stubGlobal('fetch',vi.fn(async(_url:unknown,init?:RequestInit)=>{
   if(init?.method==='POST'){if(fail)throw new TypeError('offline');return json({key:'lrn_secret_never_persist'});}
   return json({items:[],scopes:['members:read']});
 }));
 render(<MemoryRouter><IntegrationsPage/></MemoryRouter>);
 await screen.findByText('Ключей пока нет. Создайте ключ для приложения, которому требуется доступ к данным организации.');
 fireEvent.change(screen.getByLabelText('Название приложения'),{target:{value:'CRM connector'}});
 fireEvent.change(screen.getByLabelText('Действует до'),{target:{value:'2027-02-01T12:00'}});
 fireEvent.click(screen.getByLabelText('Просмотр сотрудников'));
 fireEvent.click(screen.getByRole('button',{name:'Создать ключ'}));
 await screen.findByText(/Нет связи/);
 expect(screen.getByLabelText('Название приложения')).toHaveValue('CRM connector');
 expect(readDraft<{name:string}>('integrations:key',mock.user.id)?.value.name).toBe('CRM connector');
 fail=false;fireEvent.click(screen.getByRole('button',{name:'Создать ключ'}));
 expect(await screen.findByDisplayValue('lrn_secret_never_persist')).toBeInTheDocument();
 expect(JSON.stringify(localStorage)).not.toContain('lrn_secret_never_persist');
 expect(screen.getByRole('button',{name:'Создать ключ'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Сохранил — закрыть'}));
 expect(screen.queryByDisplayValue('lrn_secret_never_persist')).not.toBeInTheDocument();
});

it('exchanges an LTI return once in StrictMode, clears the URL secret and opens the assignment',async()=>{
 const code='x'.repeat(40),state='s'.repeat(40);
 window.history.replaceState({},'','/auth#lti_code='+code+'&lti_state='+state);
 const fetch=vi.fn(async(url:unknown)=>String(url).endsWith('/lti/exchange')?json({access_token:'verified',token_type:'bearer',user:mock.user,assignment_id:44}):json({registration_enabled:true}));
 vi.stubGlobal('fetch',fetch);
 render(<StrictMode><MemoryRouter initialEntries={['/auth']}><Routes><Route path="/auth" element={<AuthPage/>}/><Route path="/learning/:id" element={<h1>Assigned course</h1>}/></Routes></MemoryRouter></StrictMode>);
 expect(await screen.findByText('Assigned course')).toBeInTheDocument();
 expect(fetch.mock.calls.filter(([url])=>String(url).endsWith('/lti/exchange'))).toHaveLength(1);
 expect(mock.completeAuthentication).toHaveBeenCalledWith(expect.objectContaining({access_token:'verified',assignment_id:44}),expect.objectContaining({generation:expect.any(Number),storedToken:null}));
 expect(window.location.hash).toBe('');
 expect(JSON.stringify(localStorage)).not.toContain(code);
});

it('retains the OIDC client secret only in memory while keeping nonsecret configuration drafts',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>json({items:[],callback_url:'https://app.example.org/api/auth/oidc/callback'})));
 render(<MemoryRouter initialEntries={['/integrations?tab=oidc']}><IntegrationsPage/></MemoryRouter>);
 await waitFor(()=>expect(screen.getByLabelText('Секрет клиента')).toBeEnabled());
 fireEvent.change(screen.getByLabelText('Название подключения'),{target:{value:'Corporate identity'}});
 fireEvent.change(screen.getByLabelText('Секрет клиента'),{target:{value:'secret-client-123'}});
 expect(readDraft<{name:string}>('integrations:oidc',mock.user.id)?.value.name).toBe('Corporate identity');
 expect(JSON.stringify(localStorage)).not.toContain('secret-client-123');
});

it('converts agreed amounts without rounding or accepting ambiguous money formats',()=>{
 expect(amountMinor('123,45')).toBe(12345);
 expect(amountMinor('0.01')).toBe(1);
 expect(amountMinor('1000000000')).toBe(100000000000);
 for(const bad of ['0','-1','1.001','1e5','Infinity','1,000.00','1000000001'])expect(()=>amountMinor(bad)).toThrow();
});

it('opens integrations for an explicit organization administrator grant',async()=>{
 mock.user.organization_role='member';
 vi.stubGlobal('fetch',vi.fn(async(url:unknown)=>String(url).endsWith('/team/permissions')?json({can_manage_team:true}):json({items:[],scopes:['members:read']})));
 render(<MemoryRouter><IntegrationsPage/></MemoryRouter>);
 expect(await screen.findByLabelText('Название приложения')).toBeInTheDocument();
 expect(screen.queryByText('Управление подключениями')).not.toBeInTheDocument();
});

it('switches integration screens to English without losing the entered configuration',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>json({items:[],scopes:['members:read']})));
 function Switch(){const {setLocale}=useLocale();return <button onClick={()=>setLocale('en')}>English</button>;}
 render(<LocaleProvider dictionaries={{en:integrationsEnglish}}><MemoryRouter><Switch/><IntegrationsPage/></MemoryRouter></LocaleProvider>);
 fireEvent.change(screen.getByLabelText('Название приложения'),{target:{value:'My customer CRM'}});
 fireEvent.click(screen.getByText('English'));
 expect(await screen.findByRole('heading',{name:'Integrations'})).toBeInTheDocument();
 expect(screen.getByLabelText('Application name')).toHaveValue('My customer CRM');
 expect(screen.getByLabelText('View employees')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Corporate sign-in'}));
 expect(await screen.findByLabelText('Client secret')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Save connection'})).toBeInTheDocument();
});
