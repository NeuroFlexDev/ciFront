import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import InvitePage from '@/Pages/InvitePage/InvitePage';
import AccessPage from '@/Pages/AccessPage/AccessPage';
import { LocaleProvider } from '@/i18n/LocaleContext';
import { publicEnglish } from '@/i18n/public';
const mock = vi.hoisted(() => ({
  user: { id: 70, email: 'invited@example.test' },
  login: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('@/auth/useAuth', () => ({ useAuth: () => mock }));
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
beforeEach(() => {
  window.history.replaceState({}, '', '/invite#token=' + 'i'.repeat(44));
  mock.user.email = 'invited@example.test';
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const invite = () =>
  render(
    <LocaleProvider dictionaries={{ en: publicEnglish }}>
      <MemoryRouter>
        <InvitePage />
      </MemoryRouter>
    </LocaleProvider>,
  );

it('retries invitation inspection after a network outage with the original token', async () => {
  const inspect = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(
      json({
        email: 'invited@example.test',
        organization_name: 'Recovered team',
        role: 'reviewer',
        existing_account: true,
      }),
    );
  vi.stubGlobal('fetch', inspect);
  invite();
  fireEvent.click(await screen.findByRole('button', { name: 'Повторить загрузку' }));
  await screen.findByRole('heading', { name: 'Recovered team' });
  expect(inspect).toHaveBeenCalledTimes(2);
  expect(JSON.parse(String(inspect.mock.calls[1][1].body))).toEqual({ token: 'i'.repeat(44) });
});

it('accepts an existing-account invitation without replacing its password or asking for a new one', async () => {
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: unknown, init?: RequestInit) => {
      const path = String(url);
      calls.push({ path, body: JSON.parse(String(init?.body)) });
      return path.endsWith('/inspect')
        ? json({
            email: 'invited@example.test',
            organization_name: 'Training team',
            role: 'reviewer',
            existing_account: true,
          })
        : json({ detail: 'Temporary failure' }, 503);
    }),
  );
  invite();
  fireEvent.click(await screen.findByRole('button', { name: 'Присоединиться к организации' }));
  await waitFor(() =>
    expect(calls.some((call) => call.path.endsWith('/accept-existing'))).toBe(true),
  );
  expect(calls.find((call) => call.path.endsWith('/accept-existing'))?.body).toEqual({
    token: 'i'.repeat(44),
  });
  expect(screen.queryByLabelText('Придумайте пароль')).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

it('does not offer acceptance from a different signed-in account', async () => {
  mock.user.email = 'other@example.test';
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      json({
        email: 'invited@example.test',
        organization_name: 'Training team',
        role: 'reviewer',
        existing_account: true,
      }),
    ),
  );
  invite();
  await screen.findByRole('button', { name: 'Выйти из другого аккаунта' });
  expect(
    screen.queryByRole('button', { name: 'Присоединиться к организации' }),
  ).not.toBeInTheDocument();
});

it('preserves the email across language changes and requests recovery in the selected language', async () => {
  const calls: Record<string, unknown>[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: unknown, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)));
      return json({
        message:
          'If the account exists, password reset instructions have been queued for delivery.',
      });
    }),
  );
  render(
    <LocaleProvider dictionaries={{ en: publicEnglish }}>
      <MemoryRouter>
        <AccessPage />
      </MemoryRouter>
    </LocaleProvider>,
  );
  fireEvent.change(screen.getByLabelText('Почта вашего аккаунта'), {
    target: { value: 'recovery@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Язык'), { target: { value: 'en' } });
  expect(screen.getByLabelText('Account email')).toHaveValue('recovery@example.test');
  fireEvent.click(screen.getByRole('button', { name: 'Get a link' }));
  await screen.findByRole('heading', { name: 'Check your email' });
  expect(calls).toEqual([{ email: 'recovery@example.test', locale: 'en' }]);
});
