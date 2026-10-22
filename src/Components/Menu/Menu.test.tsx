import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

it('reloads permissions after same-account renewal without remounting the open editor', async () => {
  state.user = { id: 81, email: 'owner@example.test', organization_id: 2, organization_role: 'owner' };
  state.token = 'expired-owner';
  state.get.mockRejectedValueOnce(new Error('401'));
  render(<MemoryRouter><Menu /><textarea aria-label='Текст урока' defaultValue='Исходный текст' /></MemoryRouter>);
  const text = screen.getByRole('textbox', { name: 'Текст урока' });
  fireEvent.change(text, { target: { value: 'Несохранённый ответ автора' } });
  await waitFor(() => expect(screen.getByText('Повторить загрузку доступных разделов')).toBeInTheDocument());
  expect(screen.queryByRole('link', { name: 'Создать курс' })).not.toBeInTheDocument();
  state.token = 'renewed-owner';
  state.get.mockResolvedValueOnce({ data: { can_author: true, can_manage_team: true, can_review: true, can_report: true } });
  act(() => window.dispatchEvent(new Event('lernium-session-renewed')));
  await screen.findByRole('link', { name: 'Создать курс' });
  expect(screen.getByRole('link', { name: 'Курсы' })).toHaveAttribute('href', '/courses');
  expect(screen.getByRole('link', { name: 'Аналитика' })).toHaveAttribute('href', '/learning-analytics');
  expect(state.get).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('textbox', { name: 'Текст урока' })).toBe(text);
  expect(text).toHaveValue('Несохранённый ответ автора');
  expect(screen.queryByText('Повторить загрузку доступных разделов')).not.toBeInTheDocument();
});

it('ignores an old permission result after renewal and caches only current permissions', async () => {
  state.user = { id: 82, email: 'member@example.test', organization_id: 2, organization_role: 'member' };
  state.token = 'before-renewal';
  let finishOld!: (value: unknown) => void;
  state.get.mockReturnValueOnce(new Promise(resolve => { finishOld = resolve; }));
  const view = show();
  state.token = 'after-renewal';
  state.get.mockResolvedValueOnce({ data: { can_author: false, can_manage_team: false, can_review: false, can_report: false } });
  act(() => window.dispatchEvent(new Event('lernium-session-renewed')));
  await waitFor(() => expect(state.get).toHaveBeenCalledTimes(2));
  await act(async () => finishOld({ data: { can_author: true, can_manage_team: true, can_review: true, can_report: true } }));
  expect(screen.queryByRole('link', { name: 'Создать курс' })).not.toBeInTheDocument();
  view.unmount();
  state.get.mockReturnValue(new Promise(() => {}));
  show();
  expect(screen.queryByRole('link', { name: 'Создать курс' })).not.toBeInTheDocument();
});
