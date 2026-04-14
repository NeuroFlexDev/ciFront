import { createContext } from "react";

export type AuthUser = {
  id: number;
  email: string;
};

export type AuthPayload = {
  email: string;
  password: string;
};

export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: AuthPayload) => Promise<void>;
  register: (payload: AuthPayload) => Promise<void>;
  logout: () => void;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
