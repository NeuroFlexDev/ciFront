import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthContext, AuthUser } from '@/hooks/useAuth';
import { getMe, logout as apiLogout } from '@/features/auth/api';

function readErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: unknown } }).response?.data &&
    typeof (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail === 'string'
  ) {
    return (error as { response: { data: { detail: string } } }).response.data.detail;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const me = await getMe();
      setUser(me);
      setError(null);
    } catch (e: unknown) {
      localStorage.removeItem('access_token');
      setUser(null);
      setError(readErrorMessage(e, 'Не удалось получить профиль'));
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
    setError(null);
  }, []);

  useEffect(() => { refreshMe(); }, [refreshMe]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'access_token') refreshMe();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refreshMe]);

  const value = { user, loading, error, refreshMe, logout, setUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
