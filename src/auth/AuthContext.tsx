import {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  type PropsWithChildren,
} from "react";

import {
  AuthContext,
  type AuthContextValue,
  type AuthPayload,
  type AuthResponse,
  type AuthUser,
} from "@/auth/auth-context";
import { apiFetch, getAuthToken, setAuthToken, bindAuthSession, authSessionChanged, captureAuthSession, assertAuthSession, authSessionIsCurrent, type AuthSessionStamp, AUTH_TOKEN_KEY, LEGACY_AUTH_TOKEN_KEY } from "@/shared/api";
import {ApiError,errorMessage} from '@/shared/errors';
import {setDraftOwner,downloadDrafts} from '@/shared/drafts';
import {RequestError} from '@/Components/RequestState';
import ConnectionNotice from '@/Components/ConnectionNotice';
import {useReconnect} from '@/hooks/useReconnect';
import {useLocale} from '@/i18n/useLocale';
import {useDialogFocus} from '@/hooks/useDialogFocus';
import {isMFAChallenge,MFAChallengeError,type MFAChallengeResponse} from './mfa';
import MFAChallengeForm from './MFAChallengeForm';
import mfaStyles from './mfa.module.css';

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: unknown };
    return typeof data.detail === "string" ? data.detail : "Проверьте заполненные поля и принятие условий.";
  } catch {
    return "Ошибка авторизации";
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const {t}=useLocale();
  const [user, setUser] = useState<AuthUser | null>(null);
  const currentUser = useRef<AuthUser | null>(null);
  function updateUser(nextUser:AuthUser|null){currentUser.current=nextUser;setUser(nextUser);}
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionChanged, setSessionChanged] = useState(false);
  const [password, setPassword] = useState('');
  const [renewError, setRenewError] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [renewChallenge,setRenewChallenge]=useState<MFAChallengeResponse|null>(null);
  const [mfaRequired,setMfaRequired]=useState<string|null>(null);
  const mfaDialog=useRef<HTMLDivElement>(null);
  useDialogFocus(mfaDialog,{active:Boolean(mfaRequired&&user),onClose:()=>setMfaRequired(null)});
  const [authError,setAuthError]=useState<unknown>(null);
  const [checkVersion,setCheckVersion]=useState(0);
  const renewDialog=useRef<HTMLDivElement>(null);
  useDialogFocus(renewDialog,{active:sessionExpired&&Boolean(user),busy:renewing,onClose:()=>setSessionExpired(false)});
  useReconnect(()=>{if(authError&&!user)setCheckVersion(v=>v+1);});
  useLayoutEffect(() => {
    const releaseBinding = bindAuthSession();
    const expire = () => { setSessionExpired(true); };
    const changed = () => { setSessionChanged(true); setSessionExpired(true); setRenewChallenge(null); setPassword(''); };
    const storage = (event: StorageEvent) => {
      if ((event.key === null || event.key === AUTH_TOKEN_KEY || event.key === LEGACY_AUTH_TOKEN_KEY) && authSessionChanged()) changed();
    };
    window.addEventListener('storage', storage);
    window.addEventListener('lernium-session-changed', changed);
    window.addEventListener('lernium-session-expired', expire);
    const stepUp=(event:Event)=>setMfaRequired((event as CustomEvent<string>).detail);
    window.addEventListener('lernium-mfa-required',stepUp);
    return () => {releaseBinding();window.removeEventListener('storage',storage);window.removeEventListener('lernium-session-changed',changed);window.removeEventListener('lernium-session-expired', expire);window.removeEventListener('lernium-mfa-required',stepUp);};
  }, []);

  useEffect(() => {
    const token = getAuthToken();

    if (!token) {
      setIsLoading(false);
      return;
    }
    let active=true;
    const session=captureAuthSession();
    const controller=new AbortController();
    setIsLoading(true);setAuthError(null);
    void (async () => {
      try {
        const response = await apiFetch("/auth/me",{signal:controller.signal});
        if(!active)return;
        assertAuthSession(session);
        if (!response.ok) {
          if(response.status===401){setAuthToken(null,session);setDraftOwner(null);updateUser(null);return;}
          throw new ApiError(response.status===403?'Доступ к аккаунту приостановлен. Обратитесь в поддержку.':'Не удалось проверить вход. Сохранённый сеанс не удалён: повторите проверку.',response.status,'http');
        }

        const nextUser = (await response.json()) as AuthUser;
        if(!active)return;
        assertAuthSession(session);
        updateUser(nextUser);
        setDraftOwner(nextUser.id);
      } catch(error) {
        if(active&&authSessionIsCurrent(session))setAuthError(error);
      } finally {
        if(active)setIsLoading(false);
      }
    })();
    return()=>{active=false;controller.abort();};
  }, [checkVersion]);

  async function authenticate(path: string, payload: AuthPayload): Promise<void> {
    const session=captureAuthSession();
    const response = await apiFetch(path, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const data = (await response.json()) as AuthResponse | MFAChallengeResponse;
    assertAuthSession(session);
    if(isMFAChallenge(data))throw new MFAChallengeError(data);
    completeAuthentication(data,session);
  }

  function completeAuthentication(data:AuthResponse, expectedSession?:AuthSessionStamp){
    if(expectedSession)assertAuthSession(expectedSession);
    if(!data.access_token||!data.user?.id)throw new Error('Сервис входа вернул неполный ответ. Повторите вход.');
    if(currentUser.current&&data.user.id!==currentUser.current.id)throw new Error('Для продолжения войдите в аккаунт этой страницы. Черновик остаётся у исходного владельца.');
    setAuthToken(data.access_token,expectedSession);
    updateUser(data.user);
    setIsLoading(false);
    setDraftOwner(data.user.id);
    setAuthError(null);
    setSessionExpired(false);
    setSessionChanged(false);
    setRenewChallenge(null);
    setMfaRequired(null);
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
    completeAuthentication,
    refreshUser: async () => {
      const session=captureAuthSession();
      const response=await apiFetch('/auth/me');
      if(response.ok){
        const nextUser=await response.json() as AuthUser;
        assertAuthSession(session);
        if(currentUser.current&&nextUser.id!==currentUser.current.id)throw new ApiError('Не удалось проверить учетные данные',401,'http');
        updateUser(nextUser);
      }
    },
    logout: () => {
      setAuthToken(null);
      updateUser(null);
      setDraftOwner(null);
      setRenewChallenge(null);setMfaRequired(null);setPassword('');
    },
  };

  return <AuthContext.Provider value={value}>
    <ConnectionNotice/>
    {authError&&!user?<RequestError error={authError} fullPage onRetry={()=>setCheckVersion(v=>v+1)} retrying={isLoading}/>:children}
    {sessionExpired && user && <div ref={renewDialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="renew-title" className="session-recovery"
      style={{position:'fixed',inset:0,zIndex:10000,background:'#10182899',display:'grid',placeItems:'center',padding:16,overflow:'auto'}}>
      {renewChallenge?<div className={mfaStyles.dialog}><h2 id="renew-title">{t('Подтвердите двухэтапный вход')}</h2><MFAChallengeForm challenge={renewChallenge} onSuccess={completeAuthentication} onCancel={()=>setRenewChallenge(null)}/></div>:<form style={{background:'#171b20',color:'#f5f6f1',padding:28,borderRadius:16,width:'min(460px,100%)',display:'grid',gap:16,maxHeight:'calc(100dvh - 32px)',overflow:'auto'}}
        onSubmit={async event => {
          event.preventDefault(); if(renewing)return; setRenewing(true); setRenewError('');
          try { await authenticate('/auth/login', {email:user.email || user.username || '',password}); }
          catch (error) { if(error instanceof MFAChallengeError){setRenewChallenge(error.challenge);setPassword('');}else setRenewError(errorMessage(error)); }
          finally { setRenewing(false); }
        }}>
        <h2 id="renew-title">{t(sessionChanged?'Сеанс изменился в другой вкладке':'Сессия истекла')}</h2>
        {sessionChanged&&<p>{t('Запросы этой страницы приостановлены, чтобы изменения не попали в другой аккаунт. Черновик остаётся у исходного владельца.')}</p>}
        <p>{t('Войдите снова как {email}. Ваши изменения остаются на странице. После входа повторите сохранение.',{email:user.email || user.username || ''})}</p>
        <label>{t('Пароль')}<input required disabled={renewing} type="password" autoComplete="current-password" value={password}
          onChange={event => setPassword(event.target.value)} /></label>
        {renewError && <p role="alert">{t(renewError)}</p>}
        <button disabled={renewing}>{t(renewing ? 'Входим…' : 'Продолжить работу')}</button>
        <button type="button" onClick={downloadDrafts}>{t('Скачать копию черновиков')}</button>
        <button type="button" disabled={renewing} onClick={()=>setSessionExpired(false)}>{t('Вернуться к черновику')}</button>
      </form>}
    </div>}
    {mfaRequired&&user&&!sessionExpired&&<div className={mfaStyles.overlay} ref={mfaDialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="mfa-title"><div className={mfaStyles.dialog}>
      <h2 id="mfa-title">{t('Подтвердите двухэтапный вход')}</h2>
      <p>{t('Введённые данные остаются на странице. После подтверждения повторите действие.')}</p>
      {mfaRequired==='mfa_enrollment_required'?<><p>{t('Для действий оператора подключите двухэтапный вход в безопасности профиля.')}</p><p><a href="/account?tab=security" target="_blank" rel="noopener">{t('Открыть безопасность профиля ↗')}</a></p><button className={mfaStyles.secondary} onClick={()=>setMfaRequired(null)}>{t('Вернуться к форме')}</button></>:<MFAChallengeForm onSuccess={completeAuthentication} onCancel={()=>setMfaRequired(null)}/>}
    </div></div>}
  </AuthContext.Provider>;
}
