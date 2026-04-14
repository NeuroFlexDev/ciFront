import { api } from '@/shared/api';

export interface User {
  id: number;
  email: string;
  full_name?: string | null;
}

export interface CourseSummary {
  id: number;
  name?: string;
  description?: string;
  level?: string | number | null;
}

export interface FeedbackItem {
  id: number;
  type?: string;
  rating?: number | null;
  comment?: string;
  lesson_id?: number | null;
}

// --- profile ---
export async function getProfile(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}

export async function updateProfile(payload: { email?: string; full_name?: string }): Promise<User> {
  const { data } = await api.patch<User>('/me', payload);
  return data;
}

// --- password ---
export async function changePassword(payload: { old_password: string; new_password: string }) {
  const { data } = await api.post('/change-password', payload);
  return data;
}

// --- courses / feedback ---
export async function getMyCourses(): Promise<CourseSummary[]> {
  const { data } = await api.get<CourseSummary[]>('/courses/my');
  return data;
}

export async function getMyFeedback(): Promise<FeedbackItem[]> {
  const { data } = await api.get<FeedbackItem[]>('/feedback/my');
  return data;
}
