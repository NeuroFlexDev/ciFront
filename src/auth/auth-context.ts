import { createContext } from "react";
import type {AuthSessionStamp} from '@/shared/api';

export type AuthUser = {
  id: number;
  email: string;
  full_name?: string;
  is_admin?: boolean;
  organization_id?: number | null;
  organization_role?: string;
};

export type AuthPayload = {
  email: string;
  password: string;
};

export type RegistrationPayload = AuthPayload & {
  full_name?: string;
  terms_accepted: boolean;
  legal_version: string;
  marketing_accepted?: boolean;
};

export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: AuthPayload) => Promise<void>;
  register: (payload: RegistrationPayload) => Promise<void>;
  logout: () => void;
  refreshUser?: () => Promise<void>;
  completeAuthentication?: (response:AuthResponse, expectedSession?:AuthSessionStamp) => void;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
