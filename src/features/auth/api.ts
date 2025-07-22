import { api } from '@/shared/api';

export async function login(email: string, password: string) {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);
  const { data } = await api.post('/login', params);
  localStorage.setItem('access_token', data.access_token);
  return data;
}

export async function register(payload: { email: string; password: string; full_name?: string }) {
  const { data } = await api.post('/register', payload);
  return data;
}

export async function getMe() {
  const { data } = await api.get('/me');
  return data;
}

export function logout() {
    localStorage.removeItem('access_token');
  }
  