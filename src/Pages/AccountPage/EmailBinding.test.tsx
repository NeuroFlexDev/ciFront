import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { api } from '@/shared/api';
import EmailBinding from './EmailBinding';
const state = vi.hoisted(() => ({ complete: vi.fn() }));
vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 20, username: 'beslim.ivan', email: null },
    completeAuthentication: state.complete,
  }),
}));
vi.mock('@/shared/api', () => ({
  api: { post: vi.fn() },
  captureAuthSession: () => ({ session: 'current' }),
  assertAuthSession: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
});
it('requests email proof without changing the account and clears the password', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { status: 'pending' } });
  render(<EmailBinding />);
  fireEvent.change(screen.getByLabelText('Ваша почта'), { target: { value: 'ivan@example.test' } });
  fireEvent.change(screen.getByLabelText('Текущий пароль'), {
    target: { value: 'employee-password-2026' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Подключить почту' }));
  await screen.findByText(
    'Проверьте почту и откройте ссылку подтверждения. Она действует 30 минут.',
  );
  expect(api.post).toHaveBeenCalledWith('/me/email', {
    email: 'ivan@example.test',
    password: 'employee-password-2026',
    locale: 'ru',
  });
  expect(state.complete).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Текущий пароль')).toHaveValue('');
});
it('consumes a fragment token only on confirmation and installs the rotated session', async () => {
  window.history.replaceState(null, '', '/account#email_token=opaque-email-proof');
  const response = {
    access_token: 'rotated',
    user: { id: 20, email: 'ivan@example.test', username: 'beslim.ivan' },
  };
  vi.mocked(api.post).mockResolvedValue({ data: response });
  render(<EmailBinding />);
  expect(window.location.hash).toBe('');
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Подтвердить почту' }));
  await waitFor(() =>
    expect(state.complete).toHaveBeenCalledWith(response, { session: 'current' }),
  );
  expect(api.post).toHaveBeenCalledWith('/me/email/confirm', { token: 'opaque-email-proof' });
});
