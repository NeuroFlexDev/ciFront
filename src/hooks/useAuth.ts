import { createContext, useContext } from 'react';

export interface AuthUser {
  id: number;
  email: string;
  full_name?: string | null;
}

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  refreshMe: () => Promise<void>;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
