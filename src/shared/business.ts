import type { AuthUser } from '@/auth/auth-context';

export const isBusiness = (user: AuthUser | null | undefined) =>
  user?.organization_kind === 'business' && !user.is_admin;
export const isBusinessManager = (user: AuthUser | null | undefined) =>
  isBusiness(user) && ['owner', 'admin', 'manager'].includes(user?.organization_role ?? '');

export const businessHome = (user: AuthUser | null | undefined, fallback: string) =>
  isBusinessManager(user) ? '/company' : isBusiness(user) ? '/learning' : fallback;
