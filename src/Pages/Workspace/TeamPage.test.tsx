import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { api } from '@/shared/api';
import { setDraftOwner } from '@/shared/drafts';
import TeamPage from './TeamPage';

vi.mock('@/shared/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, organization_id: 2, organization_role: 'owner' },
  }),
}));
vi.mock('@/Pages/TeamLearning/useRoleNames', () => ({
  useRoleNames: () => (role: string) => role,
}));
vi.mock('./shared', () => ({
  Shell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  CopyLink: ({ url }: { url: string }) => <a href={url}>Invitation link</a>,
  styles: {},
  statuses: {},
  dateText: (value: string) => value,
}));

function fixture(can_manage = true) {
  return {
    organization: {
      id: 2,
      name: 'Team',
      reserved_seats: 3,
      seat_limit: 10,
      courses: 1,
      course_limit: 10,
    },
    members: [
      {
        id: 1,
        full_name: 'Current Owner',
        email: 'owner@example.test',
        organization_role: 'owner',
        is_active: true,
        is_admin: false,
      },
      {
        id: 2,
        full_name: 'Active Member',
        email: 'active@example.test',
        organization_role: 'member',
        is_active: true,
        is_admin: false,
      },
      {
        id: 3,
        full_name: 'Paused Member',
        email: 'paused@example.test',
        organization_role: 'member',
        is_active: false,
        is_admin: false,
      },
    ],
    invitations: [],
    can_manage,
  };
}
beforeEach(() => {
  localStorage.clear();
  setDraftOwner(1);
  vi.mocked(api.get).mockResolvedValue({ data: fixture() });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
  setDraftOwner(null);
});
function open() {
  return render(
    <MemoryRouter>
      <TeamPage />
    </MemoryRouter>,
  );
}

it('keeps invitation fields mounted and preserves the draft when collapsed', async () => {
  open();
  const summary = await screen.findByText('Пригласить участника');
  const details = summary.closest('details')!;
  expect(details).not.toHaveAttribute('open');
  fireEvent.click(summary);
  const email = screen.getByRole('textbox', { name: 'Email' });
  fireEvent.change(email, { target: { value: 'new@example.test' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Роль' }), {
    target: { value: 'author' },
  });
  fireEvent.click(summary);
  expect(details).not.toHaveAttribute('open');
  expect(email).toBeInTheDocument();
  fireEvent.click(summary);
  expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('new@example.test');
  expect(screen.getByRole('combobox', { name: 'Роль' })).toHaveValue('author');
  expect(api.post).not.toHaveBeenCalled();
});

it('routes card actions to the correct member and keeps suspended assignments unavailable', async () => {
  open();
  expect(
    await screen.findByRole('link', { name: 'Current Owner · Личный профиль' }),
  ).toHaveAttribute('href', '/account');
  expect(
    screen.getByRole('link', {
      name: 'Active Member · Роли и области доступа',
    }),
  ).toHaveAttribute('href', '/groups?tab=people&user=2');
  const active = screen.getByRole('heading', { name: 'Active Member' }).closest('article')!;
  expect(within(active).getByRole('link', { name: 'Назначить курс' })).toHaveAttribute(
    'href',
    '/assignments?user=2',
  );
  const paused = screen.getByRole('heading', { name: 'Paused Member' }).closest('article')!;
  expect(within(paused).queryByRole('link', { name: 'Назначить курс' })).not.toBeInTheDocument();
  fireEvent.click(within(paused).getByText('Роли и области доступа', { selector: 'summary' }));
  expect(within(paused).getByRole('button', { name: 'Включить доступ' })).toBeEnabled();
});

it('ordinary members do not get management actions from the visual card design', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: fixture(false) });
  open();
  await screen.findByRole('heading', { name: 'Active Member' });
  expect(screen.queryByRole('link', { name: /Роли и области доступа/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Назначить курс' })).not.toBeInTheDocument();
  expect(screen.queryByText('Пригласить участника')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Current Owner · Личный профиль' })).toHaveAttribute(
    'href',
    '/account',
  );
});

it('disables invitation editing while sending so a late response cannot erase newer input', async () => {
  let resolve!: (value: { data: { url: string; mail_status: string } }) => void;
  vi.mocked(api.post).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  open();
  fireEvent.click(await screen.findByText('Пригласить участника'));
  const email = screen.getByRole('textbox', { name: 'Email' });
  fireEvent.change(email, { target: { value: 'new@example.test' } });
  fireEvent.submit(email.closest('form')!);
  expect(email).toBeDisabled();
  expect(screen.getByRole('combobox', { name: 'Роль' })).toBeDisabled();
  await act(async () => resolve({ data: { url: '/invite#test', mail_status: 'queued' } }));
  expect(email).toBeEnabled();
  expect(email).toHaveValue('');
});
