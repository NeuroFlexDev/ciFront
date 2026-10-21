import {
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import {
  AuthContext,
  type AuthContextValue,
  type AuthPayload,
  type AuthResponse,
  type AuthUser,
} from "@/auth/auth-context";
import { apiFetch, getAuthToken, setAuthToken } from "@/shared/api";
import {ApiError,errorMessage} from '@/shared/errors';
import {setDraftOwner,downloadDrafts} from '@/shared/drafts';
import {RequestError} from '@/Components/RequestState';
import ConnectionNotice from '@/Components/ConnectionNotice';
import {useReconnect} from '@/hooks/useReconnect';

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: unknown };
    return typeof data.detail === "string" ? data.detail : "Проверьте заполненные поля и принятие условий.";
  } catch {
    return "Ошибка авторизации";
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [password, setPassword] = useState('');
  const [renewError, setRenewError] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [authError,setAuthError]=useState<unknown>(null);
  const [checkVersion,setCheckVersion]=useState(0);
  useReconnect(()=>{if(authError&&!user)setCheckVersion(v=>v+1);});
  useEffect(() => {
    const expire = () => { setSessionExpired(true); };
    window.addEventListener('lernium-session-expired', expire);
    return () => window.removeEventListener('lernium-session-expired', expire);
  }, []);

  useEffect(() => {
    const token = getAuthToken();

    if (!token) {
      setIsLoading(false);
      return;
    }
    let active=true;
    const controller=new AbortController();
    setIsLoading(true);setAuthError(null);
    void (async () => {
      try {
        const response = await apiFetch("/auth/me",{signal:controller.signal});
        if(!active)return;
        if (!response.ok) {
          if(response.status===401){setAuthToken(null);setDraftOwner(null);setUser(null);return;}
          throw new ApiError(response.status===403?'Доступ к аккаунту приостановлен. Обратитесь в поддержку.':'Не удалось проверить вход. Сохранённый сеанс не удалён: повторите проверку.',response.status,'http');
        }

        const nextUser = (await response.json()) as AuthUser;
        setUser(nextUser);
        setDraftOwner(nextUser.id);
      } catch(error) {
        if(active)setAuthError(error);
      } finally {
        if(active)setIsLoading(false);
      }
    })();
    return()=>{active=false;controller.abort();};
  }, [checkVersion]);

  async function authenticate(path: string, payload: AuthPayload): Promise<void> {
    const response = await apiFetch(path, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const data = (await response.json()) as AuthResponse;
    setAuthToken(data.access_token);
    setUser(data.user);
    setDraftOwner(data.user.id);
    setAuthError(null);
    setSessionExpired(false);
    setPassword('');
    setRenewError('');
    window.dispatchEvent(new Event('lernium-session-renewed'));
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login: (payload) => authenticate("/auth/login", payload),
    register: (payload) => authenticate("/auth/register", payload),
    refreshUser: async () => {
      const response=await apiFetch('/auth/me');
      if(response.ok)setUser(await response.json() as AuthUser);
    },
    logout: () => {
      setAuthToken(null);
      setUser(null);
      setDraftOwner(null);
    },
  };

  return <AuthContext.Provider value={value}>
    <ConnectionNotice/>
    {authError&&!user?<RequestError error={authError} fullPage onRetry={()=>setCheckVersion(v=>v+1)} retrying={isLoading}/>:children}
    {sessionExpired && user && <div role="dialog" aria-modal="true" aria-labelledby="renew-title"
      style={{position:'fixed',inset:0,zIndex:10000,background:'#10182899',display:'grid',placeItems:'center'}}>
      <form style={{background:'#171b20',color:'#f5f6f1',padding:28,borderRadius:16,maxWidth:460,display:'grid',gap:16}}
        onSubmit={async event => {
          event.preventDefault(); setRenewing(true); setRenewError('');
          try { await authenticate('/auth/login', {email:user.email,password}); }
          catch (error) { setRenewError(errorMessage(error)); }
          finally { setRenewing(false); }
        }}>
        <h2 id="renew-title">Сессия истекла</h2>
        <p>Войдите снова как {user.email}. Ваши изменения остаются на странице. После входа повторите сохранение.</p>
        <label>Пароль<input autoFocus required type="password" autoComplete="current-password" value={password}
          onChange={event => setPassword(event.target.value)} /></label>
        {renewError && <p role="alert">{renewError}</p>}
        <button disabled={renewing}>{renewing ? 'Входим…' : 'Продолжить работу'}</button>
        <button type="button" onClick={downloadDrafts}>Скачать копию черновиков</button>
      </form>
    </div>}
  </AuthContext.Provider>;
}
