import { api } from '@/shared/api';

export interface User {
  id: number;
  email: string;
  full_name?: string | null;
}

// --- profile ---
export async function getProfile(): Promise<User> {
  const { data } = await api.get('/me');
  return data;
}

export async function updateProfile(payload: { email?: string; full_name?: string }) {
  const { data } = await api.patch('/me', payload);
  return data;
}

// --- password ---
export async function changePassword(payload: { old_password: string; new_password: string }) {
  const { data } = await api.post('/change-password', payload);
  return data;
}

// --- courses / feedback ---
export async function getMyCourses() {
  const { data } = await api.get('/courses/my');
  return data;
}

export async function getMyFeedback() {
  const { data } = await api.get('/feedback/my');
  return data;
}
