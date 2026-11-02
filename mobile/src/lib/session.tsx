import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Client, ApiError } from './client';
import { secure } from './secure';
import { API_ORIGIN, compatible } from './config';
import type { Session, Bootstrap, User } from './types';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) =>
        !(error instanceof ApiError && [401, 403, 404, 409].includes(error.status)) && count < 1,
      staleTime: 20000,
    },
    mutations: { retry: false },
  },
});
let updateUser: (user: User | null) => void = () => {};
const storageKey = API_ORIGIN.includes('dev.') ? 'lernium-dev-session' : 'lernium-session';
export const api = new Client(
  API_ORIGIN,
  async (session) => {
    if (session) await secure.set(storageKey, JSON.stringify(session));
    else await secure.delete(storageKey);
  },
  () => {
    queryClient.clear();
    updateUser(null);
  },
);
type Context = {
  user: User | null;
  ready: boolean;
  startupError: unknown;
  retry: () => void;
  login: (session: Session) => Promise<void>;
  logout: () => Promise<void>;
  revalidate: () => Promise<void>;
  scope: string;
};
const AuthContext = createContext<Context>(null!);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [startupError, setError] = useState<unknown>(null),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    updateUser = setUser;
    return () => {
      updateUser = () => {};
    };
  }, []);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setError(null);
        setReady(false);
        const boot = await api.public<Bootstrap>('/auth/mobile/bootstrap');
        if (boot.api_compatibility !== '1' || !compatible(boot.minimum_app_version))
          throw new Error('Для работы с сервером обновите приложение Lernium.');
        if (new URL(boot.api_origin).origin !== API_ORIGIN)
          throw new Error('Сервер сообщил другой адрес. Вход остановлен.');
        const stored = await secure.get(storageKey);
        if (stored) {
          let session: Session;
          try {
            session = JSON.parse(stored);
            if (!session.access_token || !session.refresh_token || !session.user?.id)
              throw new Error();
          } catch {
            await secure.delete(storageKey);
            return;
          }
          await api.replace(session);
          const me = await api.request<User>('/auth/me');
          if (active) setUser(me);
        }
      } catch (error) {
        if (active && !(error instanceof ApiError && error.status === 401)) setError(error);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt]);
  const login = async (session: Session) => {
    queryClient.clear();
    await api.replace(session);
    setUser(session.user);
  };
  const logout = async () => {
    await api.request('/auth/mobile/logout', 'POST');
    await api.replace(null);
    queryClient.clear();
    setUser(null);
  };
  const revalidate = useCallback(async () => {
    const me = await api.request<User>('/auth/me');
    setUser(me);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user,
          ready,
          startupError,
          retry: () => setAttempt((a) => a + 1),
          login,
          logout,
          revalidate,
          scope: API_ORIGIN + ':' + user?.organization_id + ':' + user?.id,
        }}
      >
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
export const useSession = () => useContext(AuthContext);
export function useResource<T>(path: string | null) {
  const { scope, user } = useSession();
  return useQuery({
    queryKey: [scope, path],
    queryFn: () => api.request<T>(path!),
    enabled: !!path && !!user,
  });
}
