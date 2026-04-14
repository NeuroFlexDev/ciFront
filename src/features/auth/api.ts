import { api } from '@/shared/api';
import type { AuthUser } from '@/hooks/useAuth';

type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export async function login(email: string, password: string): Promise<AuthResponse> {
  const params = new URLSearchParams();
  params.append('email', email);
  params.append('password', password);
  const { data } = await api.post<AuthResponse>('/auth/login', params);
  localStorage.setItem('access_token', data.access_token);
  return data;
}

export async function register(payload: { email: string; password: string; full_name?: string }): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', {
    email: payload.email,
    password: payload.password,
  });
  localStorage.setItem('access_token', data.access_token);
  return data;
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}

export function logout() {
    localStorage.removeItem('access_token');
  }
  
