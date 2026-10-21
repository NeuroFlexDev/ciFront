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

    void (async () => {
      try {
        const response = await apiFetch("/auth/me");
        if (!response.ok) {
          throw new Error("Сессия недействительна");
        }

        const nextUser = (await response.json()) as AuthUser;
        setUser(nextUser);
      } catch {
        setAuthToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

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
    setSessionExpired(false);
    setPassword('');
    setRenewError('');
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login: (payload) => authenticate("/auth/login", payload),
    register: (payload) => authenticate("/auth/register", payload),
    logout: () => {
      setAuthToken(null);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>
    {children}
    {sessionExpired && user && <div role="dialog" aria-modal="true" aria-labelledby="renew-title"
      style={{position:'fixed',inset:0,zIndex:10000,background:'#10182899',display:'grid',placeItems:'center'}}>
      <form style={{background:'white',padding:28,borderRadius:16,maxWidth:420,display:'grid',gap:16}}
        onSubmit={async event => {
          event.preventDefault(); setRenewing(true); setRenewError('');
          try { await authenticate('/auth/login', {email:user.email,password}); }
          catch (error) { setRenewError(error instanceof Error ? error.message : 'Не удалось войти'); }
          finally { setRenewing(false); }
        }}>
        <h2 id="renew-title">Сессия истекла</h2>
        <p>Войдите снова как {user.email}. Ваши изменения остаются на странице. После входа повторите сохранение.</p>
        <label>Пароль<input autoFocus required type="password" autoComplete="current-password" value={password}
          onChange={event => setPassword(event.target.value)} /></label>
        {renewError && <p role="alert">{renewError}</p>}
        <button disabled={renewing}>{renewing ? 'Входим…' : 'Продолжить работу'}</button>
      </form>
    </div>}
  </AuthContext.Provider>;
}
