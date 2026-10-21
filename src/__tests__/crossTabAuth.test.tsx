import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {AuthProvider} from '@/auth/AuthContext';
import {useAuth} from '@/auth/useAuth';
import {useDurableState} from '@/hooks/useDurableState';
import {api,AUTH_TOKEN_KEY,LEGACY_AUTH_TOKEN_KEY,getAuthToken,setAuthToken} from '@/shared/api';
import {getDraftOwner,readDraft,setDraftOwner} from '@/shared/drafts';

const alice={id:7,email:'alice@example.test'};
const bob={id:8,email:'bob@example.test'};
const json=(body:unknown)=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
afterEach(()=>{cleanup();vi.unstubAllGlobals();localStorage.clear();sessionStorage.clear();setDraftOwner(null);});
function Editor(){
  const {user,isLoading,logout}=useAuth();
  const [value,setValue]=useDurableState('team-settings','');
  if(isLoading)return <p>Loading account</p>;
  return <><p>{user?.email}</p><input aria-label="Team draft" value={value} onChange={e=>setValue(e.target.value)}/><button onClick={logout}>Sign out here</button></>;
}
function otherTab(token:string|null){
  if(token){localStorage.setItem(AUTH_TOKEN_KEY,token);localStorage.setItem(LEGACY_AUTH_TOKEN_KEY,token);}
  else{localStorage.removeItem(AUTH_TOKEN_KEY);localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);}
}

it('blocks an old form before storage notification, preserves its owner and requires explicit retry after same-account renewal',async()=>{
  setAuthToken('alice-token');
  const fetchMock=vi.fn(async(url:unknown,init?:RequestInit)=>{
    if(String(url).endsWith('/auth/me'))return json(alice);
    if(String(url).endsWith('/auth/login')){
      expect(JSON.parse(String(init?.body)).email).toBe(alice.email);
      return json({access_token:'alice-renewed',user:alice});
    }
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer alice-renewed');
    return json({saved:true});
  });
  vi.stubGlobal('fetch',fetchMock);
  render(<AuthProvider><Editor/></AuthProvider>);
  fireEvent.change(await screen.findByLabelText('Team draft'),{target:{value:'Alice organization settings'}});
  otherTab('bob-token');
  await act(async()=>{await expect(api.put('/team/settings',{name:'Alice organization settings'})).rejects.toThrow('другой вкладке');});
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(await screen.findByRole('heading',{name:'Сеанс изменился в другой вкладке'})).toBeInTheDocument();
  expect(getAuthToken()).toBe('alice-token');
  expect(getDraftOwner()).toBe(7);
  expect(readDraft('team-settings',7)?.value).toBe('Alice organization settings');
  expect(readDraft('team-settings',8)).toBeNull();
  fireEvent.change(screen.getByLabelText('Пароль'),{target:{value:'alice-password'}});
  fireEvent.click(screen.getByRole('button',{name:'Продолжить работу'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByLabelText('Team draft')).toHaveValue('Alice organization settings');
  expect(fetchMock).toHaveBeenCalledTimes(2); // Never automatically replay the mutation.
  await api.put('/team/settings',{name:'Alice organization settings'});
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it('shows a changed-session dialog for external logout and refuses to attach a different account to the mounted draft',async()=>{
  setAuthToken('alice-token');
  vi.stubGlobal('fetch',vi.fn(async(url:unknown)=>String(url).endsWith('/auth/me')?json(alice):json({access_token:'bob-token',user:bob})));
  render(<AuthProvider><Editor/></AuthProvider>);
  fireEvent.change(await screen.findByLabelText('Team draft'),{target:{value:'Original draft'}});
  act(()=>{otherTab(null);window.dispatchEvent(new StorageEvent('storage',{key:AUTH_TOKEN_KEY,newValue:null}));});
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Пароль'),{target:{value:'example-password'}});
  fireEvent.click(screen.getByRole('button',{name:'Продолжить работу'}));
  expect(await screen.findByText('Для продолжения войдите в аккаунт этой страницы. Черновик остаётся у исходного владельца.')).toBeInTheDocument();
  expect(getAuthToken()).toBe('alice-token');
  expect(getDraftOwner()).toBe(7);
  expect(screen.getByLabelText('Team draft')).toHaveValue('Original draft');
});

it('logging out an old tab does not delete the new session in another tab',async()=>{
  setAuthToken('alice-token');
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(json(alice)));
  render(<AuthProvider><Editor/></AuthProvider>);
  await screen.findByLabelText('Team draft');
  otherTab('bob-token');
  fireEvent.click(screen.getByRole('button',{name:'Sign out here'}));
  expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('bob-token');
  expect(getAuthToken()).toBeNull();
});
