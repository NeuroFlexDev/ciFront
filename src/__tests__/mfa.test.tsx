import {useState,StrictMode} from 'react';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import {AuthProvider} from '@/auth/AuthContext';
import AuthPage from '@/Pages/AuthPage/AuthPage';
import MFASettings from '@/Pages/AccountPage/MFASettings';
import {api,setAuthToken,getAuthToken} from '@/shared/api';
import {LocaleProvider} from '@/i18n/LocaleContext';
import {integrationsEnglish} from '@/i18n/integrations';
import {useLocale} from '@/i18n/useLocale';

const user={id:7,email:'operator@example.org',is_admin:true};
const verified={access_token:'mfa-verified',token_type:'bearer',user};
const challenge={mfa_required:true,challenge_token:'challenge-not-a-jwt',expires_at:'2027-01-01T00:00:00Z'};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();localStorage.clear();sessionStorage.clear();window.history.replaceState({},'','/');});
function Editor(){const [text,setText]=useState('');return <input aria-label="Lesson draft" value={text} onChange={e=>setText(e.target.value)}/>;}

it('does not authenticate a password-only MFA response and preserves a rejected code for correction',async()=>{
 let attempts=0;
 vi.stubGlobal('fetch',vi.fn(async(url:unknown)=>{
   const path=String(url);
   if(path.endsWith('/auth/login'))return response(challenge);
   if(path.endsWith('/auth/mfa/verify'))return ++attempts===1?response({detail:'Код неверен, уже использован или истёк. Введите новый код либо код восстановления.'},400):response(verified);
   return response({registration_enabled:true});
 }));
 render(<MemoryRouter initialEntries={['/auth']}><AuthProvider><Routes><Route path="/auth" element={<AuthPage/>}/><Route path="/admin" element={<h1>Operator</h1>}/></Routes></AuthProvider></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Ваша почта'),{target:{value:user.email}});
 fireEvent.change(screen.getByLabelText('Пароль'),{target:{value:'private-password'}});
 fireEvent.click(screen.getByRole('button',{name:'Войти'}));
 const field=await screen.findByLabelText('Код подтверждения');
 expect(getAuthToken()).toBeNull();
 fireEvent.change(field,{target:{value:'123456'}});
 fireEvent.click(screen.getByRole('button',{name:'Подтвердить вход'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Код неверен');
 expect(field).toHaveValue('123456');
 expect(JSON.stringify(localStorage)).not.toMatch(/private-password|challenge-not-a-jwt|123456/);
 fireEvent.change(field,{target:{value:'654321'}});
 fireEvent.click(screen.getByRole('button',{name:'Подтвердить вход'}));
 expect(await screen.findByText('Operator')).toBeInTheDocument();
 expect(getAuthToken()).toBe('mfa-verified');
});

it('keeps an unsaved answer mounted through password and MFA session renewal',async()=>{
 setAuthToken('old-token');
 vi.stubGlobal('fetch',vi.fn(async(url:unknown)=>String(url).endsWith('/auth/me')?response(user):String(url).endsWith('/auth/login')?response(challenge):response(verified)));
 render(<AuthProvider><Editor/></AuthProvider>);
 await act(async()=>{});
 fireEvent.change(screen.getByLabelText('Lesson draft'),{target:{value:'Unsaved evidence'}});
 act(()=>window.dispatchEvent(new CustomEvent('lernium-session-expired')));
 fireEvent.change(await screen.findByLabelText('Пароль'),{target:{value:'private-password'}});
 fireEvent.click(screen.getByRole('button',{name:'Продолжить работу'}));
 fireEvent.change(await screen.findByLabelText('Код подтверждения'),{target:{value:'123456'}});
 expect(screen.getByLabelText('Lesson draft')).toHaveValue('Unsaved evidence');
 fireEvent.click(screen.getByRole('button',{name:'Подтвердить вход'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 expect(screen.getByLabelText('Lesson draft')).toHaveValue('Unsaved evidence');
 expect(getAuthToken()).toBe('mfa-verified');
 expect(JSON.stringify(localStorage)).not.toContain('challenge-not-a-jwt');
});

it('shows operator step-up without replaying the rejected mutation',async()=>{
 setAuthToken('existing-token');
 const fetch=vi.fn(async(url:unknown)=>String(url).endsWith('/auth/me')?response(user):String(url).endsWith('/auth/mfa/step-up')?response(verified):response({detail:{code:'mfa_step_up_required',message:'Verify'}},403));
 vi.stubGlobal('fetch',fetch);
 render(<AuthProvider><Editor/></AuthProvider>);
 await act(async()=>{});
 fireEvent.change(screen.getByLabelText('Lesson draft'),{target:{value:'Pending correction'}});
 await act(async()=>{await expect(api.post('/admin/sensitive-action',{value:'pending'})).rejects.toThrow('Verify');});
 fireEvent.change(await screen.findByLabelText('Код подтверждения'),{target:{value:'123456'}});
 fireEvent.click(screen.getByRole('button',{name:'Подтвердить вход'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 expect(fetch.mock.calls.filter(([url])=>String(url).endsWith('/admin/sensitive-action'))).toHaveLength(1);
 expect(screen.getByLabelText('Lesson draft')).toHaveValue('Pending correction');
});

it.each(['oidc','lti'])('requires MFA after %s exchange and only then follows the target',async kind=>{
 const code='s'.repeat(40),state='t'.repeat(40),prefix=kind==='lti'?'lti':'sso';
 window.history.replaceState({},'','/auth#'+prefix+'_code='+code+'&'+prefix+'_state='+state);
 const fetch=vi.fn(async(url:unknown)=>String(url).endsWith('/exchange')?response(challenge):String(url).endsWith('/auth/mfa/verify')?response({...verified,assignment_id:42}):response({registration_enabled:true}));
 vi.stubGlobal('fetch',fetch);
 render(<StrictMode><MemoryRouter initialEntries={['/auth']}><AuthProvider><Routes><Route path="/auth" element={<AuthPage/>}/><Route path="/learning/:id" element={<h1>Assigned lesson</h1>}/></Routes></AuthProvider></MemoryRouter></StrictMode>);
 const field=await screen.findByLabelText('Код подтверждения');
 expect(getAuthToken()).toBeNull();
 expect(fetch.mock.calls.filter(([url])=>String(url).endsWith('/exchange'))).toHaveLength(1);
 expect(window.location.hash).toBe('');
 fireEvent.change(field,{target:{value:'123456'}});
 fireEvent.click(screen.getByRole('button',{name:'Подтвердить вход'}));
 expect(await screen.findByText('Assigned lesson')).toBeInTheDocument();
 expect(getAuthToken()).toBe('mfa-verified');
});

it('only enables after OTP proof, keeps enrollment in memory, and translates without resetting it',async()=>{
 setAuthToken('existing-token');
 let enabled=false,confirmations=0;
 const fetch=vi.fn(async(url:unknown,init?:RequestInit)=>{
   const path=String(url);
   if(path.endsWith('/auth/me'))return response(user);
   if(path.endsWith('/status'))return response({enabled,enrollment_available:true,required_for_operator:false,remaining_recovery_codes:enabled?10:0});
   if(path.endsWith('/enroll'))return response({secret:'SECRET-FOR-APP',otpauth_uri:'otpauth://totp/Lernium?secret=SECRET-FOR-APP',enrollment_token:'private-setup-token',expires_at:'2027-01-01T00:00:00Z'});
   if(path.endsWith('/confirm')){
     confirmations++;
     expect(JSON.parse(String(init?.body))).toEqual({enrollment_token:'private-setup-token',code:'123456'});
     if(confirmations===1)throw new TypeError('offline');
     enabled=true;return response({...verified,recovery_codes:['abcd-1111-2222-3333-4444-5555']});
   }
   throw Error('Unexpected endpoint');
 });
 vi.stubGlobal('fetch',fetch);
 function Switch(){const {setLocale}=useLocale();return <button onClick={()=>setLocale('en')}>English</button>;}
 render(<LocaleProvider dictionaries={{en:integrationsEnglish}}><AuthProvider><Switch/><MFASettings/></AuthProvider></LocaleProvider>);
 fireEvent.change(await screen.findByLabelText('Текущий пароль'),{target:{value:'private-password'}});
 fireEvent.click(screen.getByRole('button',{name:'Подключить приложение-аутентификатор'}));
 expect(await screen.findByText('SECRET-FOR-APP')).toBeInTheDocument();
 expect(enabled).toBe(false);
 fireEvent.change(screen.getByLabelText('Код из приложения'),{target:{value:'123456'}});
 fireEvent.click(screen.getByRole('button',{name:'English'}));
 expect(screen.getByLabelText('Authenticator app code')).toHaveValue('123456');
 fireEvent.click(screen.getByRole('button',{name:'Confirm enrollment'}));
 await screen.findByRole('alert');
 expect(screen.getByText('SECRET-FOR-APP')).toBeInTheDocument();
 expect(JSON.stringify(localStorage)).not.toMatch(/SECRET-FOR-APP|private-setup-token|private-password|123456/);
 fireEvent.click(screen.getByRole('button',{name:'Confirm enrollment'}));
 expect(await screen.findByText('abcd-1111-2222-3333-4444-5555')).toBeInTheDocument();
 expect(JSON.stringify(localStorage)).not.toContain('abcd-1111');
 fireEvent.click(screen.getByRole('button',{name:'I saved the codes — hide'}));
 expect(screen.queryByText('abcd-1111-2222-3333-4444-5555')).not.toBeInTheDocument();
});

