import { expect, it } from 'vitest';
import { businessTranslation } from './businessTerminology';
import { translate } from './locale';
import { businessHome } from '@/shared/business';
import type { AuthUser } from '@/auth/auth-context';

it('localizes registered interface messages without modifying customer names or text', () => {
  const ru = (key: string, params?: Record<string, string | number>) => businessTranslation('ru', key, params, (k, p) => translate('ru', k, p));
  expect(ru('Редактор курса')).toBe('Редактор регламента');
  expect(ru('Редактировать модуль {v0}', {v0: 'Курс валют'})).toBe('Редактировать раздел Курс валют');
  expect(ru('Курс валют и уроки сервиса — текст заказчика')).toBe('Курс валют и уроки сервиса — текст заказчика');
  expect(businessTranslation('en', 'Редактор курса', undefined, k => translate('en', k))).toBe('Regulation editor');
});

it('routes managers to personnel, employees to their assignments and leaves other tenants unchanged', () => {
  const user = { organization_kind: 'business', organization_role: 'manager' } as AuthUser;
  expect(businessHome(user, '/dashboard')).toBe('/company');
  expect(businessHome({...user, organization_role: 'member'}, '/dashboard')).toBe('/learning');
  expect(businessHome({...user, organization_kind: 'government'}, '/dashboard')).toBe('/dashboard');
  expect(businessHome({...user, is_admin: true}, '/admin')).toBe('/admin');
});
