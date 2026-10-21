import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Menu from './Menu';

const state = vi.hoisted(() => ({
  token: 'menu-author',
  user: { id: 71, email: 'author@example.test', organization_id: 1, organization_role: 'author' },
  get: vi.fn(),
}));
vi.mock('@/auth/useAuth', () => ({ useAuth: () => ({ user: state.user, logout: vi.fn() }) }));
vi.mock('@/shared/api', () => ({ getAuthToken: () => state.token, api: { get: state.get } }));
vi.mock('@/Pages/TeamLearning/useRoleNames', () => ({
  useRoleNames: () => (role: string) => role,
}));
afterEach(() => {
  cleanup();
  state.get.mockReset();
});
const show = () =>
  render(
    <MemoryRouter>
      <Menu />
    </MemoryRouter>,
  );

it('retains navigation during a routed page change but not a different session', async () => {
  state.get.mockResolvedValueOnce({
    data: { can_author: true, can_manage_team: false, can_review: false, can_report: false },
  });
  const first = show();
  await screen.findByRole('link', { name: 'Создать курс' });
  first.unmount();
  state.get.mockReturnValue(new Promise(() => {}));
  const second = show();
  expect(screen.getByRole('link', { name: 'Создать курс' })).toBeInTheDocument();
  second.unmount();
  state.token = 'menu-member';
  state.user = {
    id: 72,
    email: 'member@example.test',
    organization_id: 1,
    organization_role: 'member',
  };
  show();
  expect(screen.queryByRole('link', { name: 'Создать курс' })).not.toBeInTheDocument();
});
