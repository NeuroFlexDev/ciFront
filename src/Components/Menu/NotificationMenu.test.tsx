import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { api } from '@/shared/api';
import NotificationMenu from './NotificationMenu';

const identity = vi.hoisted(() => ({ id: 41, organization_id: 3 }));
vi.mock('@/auth/useAuth', () => ({ useAuth: () => ({ user: identity }) }));
vi.mock('@/shared/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
const fixtures = [
  {
    id: 101,
    category: 'assignment',
    title: 'Действующее обучение',
    body: 'Вам назначен регламент',
    resource_type: 'assignment',
    resource_id: 1,
    created_at: '2026-10-25T12:00:00Z',
    read_at: null,
  },
  {
    id: 102,
    category: 'generation',
    title: 'Готовый курс',
    body: 'Генерация завершена',
    resource_type: 'course',
    resource_id: 7,
    created_at: '2026-10-25T13:00:00Z',
    read_at: null,
  },
];
const readThrough = new Map<number, number>();
beforeEach(() => {
  identity.id = 41;
  readThrough.clear();
  vi.mocked(api.get)
    .mockReset()
    .mockImplementation(async () => {
      const items = fixtures.map((item) => ({
        ...item,
        read_at: item.id <= (readThrough.get(identity.id) || 0) ? '2026-10-26T12:00:00Z' : null,
      }));
      return {
        data: {
          items,
          unread_count: items.filter((item) => !item.read_at).length,
          latest_id: 102,
          next_cursor: null,
        },
      } as Awaited<ReturnType<typeof api.get>>;
    });
  vi.mocked(api.post)
    .mockReset()
    .mockImplementation(async (path, data) => {
      if (path === '/notifications/read-all')
        readThrough.set(identity.id, (data as { through_id: number }).through_id);
      return { data: {} } as Awaited<ReturnType<typeof api.post>>;
    });
});
afterEach(cleanup);
function show() {
  return render(
    <MemoryRouter>
      <NotificationMenu author />
    </MemoryRouter>,
  );
}
async function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Уведомления' }));
  const panel = screen.getByRole('region', { name: 'Центр уведомлений' });
  await within(panel).findByRole('link', { name: /Действующее обучение/ });
  return panel;
}

it('loads the server inbox, links to its resources and closes with Escape', async () => {
  show();
  const panel = await open();
  expect(api.get).toHaveBeenCalledWith('/notifications?limit=30');
  expect(within(panel).getByRole('link', { name: /Действующее обучение/ })).toHaveAttribute(
    'href',
    '/learning/1',
  );
  expect(within(panel).getByRole('link', { name: /Готовый курс/ })).toHaveAttribute(
    'href',
    '/courses/7/edit',
  );
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('region', { name: 'Центр уведомлений' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Уведомления' })).toHaveFocus();
});

it('persists read markers on the server up to the displayed watermark and isolates accounts', async () => {
  const first = show();
  let panel = await open();
  fireEvent.click(within(panel).getByRole('button', { name: 'Прочитать все' }));
  await within(panel).findByRole('button', { name: 'Непрочитанные · 0' });
  expect(api.post).toHaveBeenCalledWith('/notifications/read-all', { through_id: 102 });
  first.unmount();
  const reopened = show();
  panel = await open();
  expect(within(panel).getByRole('button', { name: 'Непрочитанные · 0' })).toBeVisible();
  reopened.unmount();
  identity.id = 42;
  show();
  panel = await open();
  expect(within(panel).getByRole('button', { name: 'Непрочитанные · 2' })).toBeVisible();
});

it('does not mark anything as read when the server rejects the write', async () => {
  vi.mocked(api.post).mockRejectedValueOnce(new Error('Соединение прервано'));
  show();
  const panel = await open();
  fireEvent.click(within(panel).getByRole('button', { name: 'Прочитать все' }));
  await within(panel).findByRole('alert');
  expect(within(panel).getByRole('button', { name: 'Непрочитанные · 2' })).toBeVisible();
  expect(readThrough.size).toBe(0);
  await waitFor(() =>
    expect(within(panel).getByRole('button', { name: 'Прочитать все' })).toBeEnabled(),
  );
});

it('marks an opened notification through its authenticated API before navigating', async () => {
  show();
  const panel = await open();
  fireEvent.click(within(panel).getByRole('link', { name: /Действующее обучение/ }));
  expect(api.post).toHaveBeenCalledWith('/notifications/101/read');
  expect(screen.queryByRole('region', { name: 'Центр уведомлений' })).not.toBeInTheDocument();
});
