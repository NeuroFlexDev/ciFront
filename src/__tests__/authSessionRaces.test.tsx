import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import {StrictMode} from 'react';
import {AuthProvider} from '@/auth/AuthContext';
import {useAuth} from '@/auth/useAuth';
import {api,apiFetch,getAuthToken,setAuthToken,AUTH_TOKEN_KEY,LEGACY_AUTH_TOKEN_KEY,captureAuthSession} from '@/shared/api';
import {setDraftOwner} from '@/shared/drafts';
import AccountPage from '@/Pages/AccountPage/AccountPage';
import AuthPage from '@/Pages/AuthPage/AuthPage';
vi.mock('@/Pages/AccountPage/IdentityLinks',()=>({default:()=>null}));
vi.mock('@/Pages/AccountPage/MFASettings',()=>({default:()=>null}));
const alice={id:7,email:'alice@example.test'},bob={id:8,email:'bob@example.test'};
const json=(body:unknown)=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
let auth:ReturnType<typeof useAuth>;
function Capture(){auth=useAuth();return <p>{auth.user?.email??'anonymous'}</p>;}
afterEach(()=>{cleanup();vi.unstubAllGlobals();localStorage.clear();sessionStorage.clear();setDraftOwner(null);});

it('late refreshUser must not overwrite a newer authenticated identity',async()=>{
  setAuthToken('alice-token');
  let resolve!:(r:Response)=>void;const delayed=new Promise<Response>(r=>resolve=r);let me=0;
  vi.stubGlobal('fetch',vi.fn(async(url:unknown)=>String(url).endsWith('/auth/me')?++me===1?json(alice):delayed:json({access_token:'bob-token',user:bob})));
  render(<AuthProvider><Capture/></AuthProvider>);
  await screen.findByText(alice.email);
  let refresh!:Promise<void>;act(()=>{refresh=auth.refreshUser!();});
  act(()=>auth.logout());
  await act(async()=>{await auth.login({email:bob.email,password:'example'});});
  expect(auth.user?.id).toBe(8);expect(getAuthToken()).toBe('bob-token');
  await act(async()=>{resolve(json(alice));await expect(refresh).rejects.toThrow('Сеанс изменился во время запроса');});
  expect(auth.user?.id).toBe(8);
});

it('late bootstrap me must not overwrite an SSO-authenticated identity',async()=>{
  setAuthToken('alice-token');
  let resolve!:(r:unknown)=>void;const delayed=new Promise<unknown>(r=>resolve=r);
  const reply=json({});vi.spyOn(reply,'json').mockImplementation(()=>delayed);
  vi.stubGlobal('fetch',vi.fn(async()=>reply));
  render(<AuthProvider><Capture/></AuthProvider>);
  await waitFor(()=>expect(reply.json).toHaveBeenCalled());
  act(()=>auth.completeAuthentication!({access_token:'bob-token',token_type:'bearer',user:bob}));
  expect(auth.user?.id).toBe(8);expect(getAuthToken()).toBe('bob-token');
  await act(async()=>{resolve(alice);await delayed;});
  expect(auth.user?.id).toBe(8);
});

it('late password-change response from an unmounted account must not replace the new account token',async()=>{
  setAuthToken('alice-token');
  let resolve!:(r:Response)=>void;const delayed=new Promise<Response>(r=>resolve=r);
  const fetchMock=vi.fn(async(url:unknown)=>{
    if(String(url).endsWith('/auth/me'))return json(alice);
    if(String(url).endsWith('/change-password'))return delayed;
    if(String(url).endsWith('/auth/login'))return json({access_token:'bob-token',user:bob});
    return json({receipts:[],marketing_active:false});
  });vi.stubGlobal('fetch',fetchMock);
  function Harness(){auth=useAuth();return auth.user?<AccountPage/>:<button onClick={()=>auth.login({email:bob.email,password:'example'})}>Login Bob</button>;}
  render(<MemoryRouter initialEntries={['/account?tab=security']}><AuthProvider><Harness/></AuthProvider></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Текущий пароль'),{target:{value:'old-password'}});
  fireEvent.change(screen.getByLabelText('Новый пароль'),{target:{value:'new-long-password'}});
  fireEvent.click(screen.getByRole('button',{name:'Изменить пароль'}));
  await waitFor(()=>expect(fetchMock.mock.calls.some(([url])=>String(url).endsWith('/change-password'))).toBe(true));
  fireEvent.click(screen.getByRole('banner').querySelector('summary')!);
  fireEvent.click(screen.getByRole('button',{name:'Выйти из аккаунта ↗'}));
  fireEvent.click(screen.getByRole('button',{name:'Login Bob'}));
  await waitFor(()=>expect(auth.user?.id).toBe(8));
  await act(async()=>{resolve(json({access_token:'alice-password-new'}));await delayed;});
  expect(auth.user?.id).toBe(8);
  expect(getAuthToken()).toBe('bob-token');
});

it('checks again after the JSON body finishes, not only when headers arrive',async()=>{
  setAuthToken('alice-token');
  let resolve!:(r:unknown)=>void;const body=new Promise<unknown>(r=>resolve=r);
  const reply=json({});vi.spyOn(reply,'json').mockImplementation(()=>body);
  vi.stubGlobal('fetch',vi.fn(async(url:unknown)=>String(url).endsWith('/auth/me')?json(alice):reply));
  render(<AuthProvider><Capture/></AuthProvider>);
  await screen.findByText(alice.email);
  const result=api.get('/team/settings');
  await waitFor(()=>expect(reply.json).toHaveBeenCalled());
  act(()=>auth.logout());
  await act(async()=>{resolve({private:'Alice settings'});await expect(result).rejects.toThrow('Сеанс изменился во время запроса');});
  expect(auth.user).toBeNull();
});

it('does not apply a stale 401 event to the new session',async()=>{
  setAuthToken('alice-token');
  let resolve!:(r:Response)=>void;const delayed=new Promise<Response>(r=>resolve=r);
  const expired=vi.fn();window.addEventListener('lernium-session-expired',expired);
  vi.stubGlobal('fetch',vi.fn(async(url:unknown)=>{
    if(String(url).endsWith('/auth/me'))return json(alice);
    if(String(url).endsWith('/auth/login'))return json({access_token:'bob-token',user:bob});
    return delayed;
  }));
  render(<AuthProvider><Capture/></AuthProvider>);
  await screen.findByText(alice.email);
  const result=apiFetch('/team/settings');
  act(()=>auth.logout());
  await act(async()=>{await auth.login({email:bob.email,password:'example'});});
  await act(async()=>{resolve(new Response('{}',{status:401}));await expect(result).rejects.toThrow('Сеанс изменился во время запроса');});
  expect(auth.user?.id).toBe(8);expect(expired).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  window.removeEventListener('lernium-session-expired',expired);
});

it('allows original-account reauthentication against an unchanged other-tab token but rejects a change during that request',async()=>{
  setAuthToken('alice-token');
  let resolve!:(r:Response)=>void;const delayed=new Promise<Response>(r=>resolve=r);
  vi.stubGlobal('fetch',vi.fn(async(url:unknown)=>String(url).endsWith('/auth/me')?json(alice):delayed));
  render(<AuthProvider><Capture/></AuthProvider>);
  await screen.findByText(alice.email);
  localStorage.setItem(AUTH_TOKEN_KEY,'bob-token');localStorage.setItem(LEGACY_AUTH_TOKEN_KEY,'bob-token');
  const login=auth.login({email:alice.email,password:'example'});
  localStorage.setItem(AUTH_TOKEN_KEY,'bob-renewed');localStorage.setItem(LEGACY_AUTH_TOKEN_KEY,'bob-renewed');
  await act(async()=>{resolve(json({access_token:'alice-renewed',user:alice}));await expect(login).rejects.toThrow('Сеанс изменился во время запроса');});
  expect(auth.user?.id).toBe(7);expect(getAuthToken()).toBe('alice-token');
  expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('bob-renewed');
});

it('does not consume an SSO code during the StrictMode session bootstrap',async()=>{
  window.history.replaceState({},'', '/auth#sso_code=one-use&sso_state=state');
  const fetchMock=vi.fn(async(url:unknown)=>String(url).endsWith('/auth/oidc/exchange')?json({access_token:'alice-token',user:alice}):json({registration_enabled:false}));
  vi.stubGlobal('fetch',fetchMock);
  render(<StrictMode><MemoryRouter initialEntries={['/auth']}><AuthProvider><AuthPage/><Capture/></AuthProvider></MemoryRouter></StrictMode>);
  await waitFor(()=>expect(auth.user?.id).toBe(7));
  expect(fetchMock.mock.calls.filter(([url])=>String(url).endsWith('/auth/oidc/exchange'))).toHaveLength(1);
  expect(getAuthToken()).toBe('alice-token');
  window.history.replaceState({},'', '/');
});

it('rejects a previously captured completion even if the token string cycles back',async()=>{
  setAuthToken('alice-token');
  const old=captureAuthSession();
  setAuthToken(null);setAuthToken('alice-token');
  expect(()=>setAuthToken('stale-replacement',old)).toThrow('Сеанс изменился во время запроса');
  expect(getAuthToken()).toBe('alice-token');
});
