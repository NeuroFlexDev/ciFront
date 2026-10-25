import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NotificationMenu from './NotificationMenu';

const identity = vi.hoisted(() => ({ id: 41, organization_id: 3 }));
vi.mock('@/auth/useAuth', () => ({ useAuth: () => ({ user: identity }) }));
vi.mock('@/Pages/Learning/useLearningData', () => ({
  useLearningData: (path: string | null) => ({
    loading: false,
    error: null,
    reload: vi.fn(),
    data: path?.startsWith('/learning/')
      ? {
          items: [
            {
              id: 1,
              title: 'Действующее обучение',
              state: 'active',
              status: 'assigned',
              created_at: '2026-10-25T12:00:00Z',
            },
            {
              id: 2,
              title: 'Отозванное обучение',
              state: 'revoked',
              status: 'assigned',
              created_at: '2026-10-25T12:00:00Z',
            },
          ],
        }
      : path === '/workspace/overview'
        ? {
            courses: [{ id: 7, title: 'Готовый курс' }],
            runs: [
              { id: 9, course_id: 7, status: 'succeeded', created_at: '2026-10-25T13:00:00Z' },
            ],
          }
        : null,
  }),
}));
beforeEach(() => {
  localStorage.clear();
  identity.id = 41;
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});
function show() {
  return render(
    <MemoryRouter>
      <NotificationMenu author />
    </MemoryRouter>,
  );
}
function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Уведомления' }));
  return screen.getByRole('region', { name: 'Центр уведомлений' });
}

it('shows actual assignment and succeeded generation links, omits revoked assignments and closes with Escape', () => {
  show();
  const panel = open();
  expect(within(panel).getByRole('link', { name: /Действующее обучение/ })).toHaveAttribute(
    'href',
    '/learning/1',
  );
  expect(within(panel).getByRole('link', { name: /Готовый курс/ })).toHaveAttribute(
    'href',
    '/courses/7/edit',
  );
  expect(within(panel).queryByText('Отозванное обучение')).not.toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('region', { name: 'Центр уведомлений' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Уведомления' })).toHaveFocus();
});

it('keeps read markers across reopening and isolates them by account', () => {
  const first = show();
  let panel = open();
  fireEvent.click(within(panel).getByRole('button', { name: 'Прочитать все' }));
  expect(within(panel).getByRole('button', { name: 'Непрочитанные · 0' })).toBeVisible();
  first.unmount();
  const reopened = show();
  panel = open();
  expect(within(panel).getByRole('button', { name: 'Непрочитанные · 0' })).toBeVisible();
  reopened.unmount();
  identity.id = 42;
  show();
  panel = open();
  expect(within(panel).getByRole('button', { name: 'Непрочитанные · 2' })).toBeVisible();
});
