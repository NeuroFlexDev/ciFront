import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminCoursePanel, { type ManagedCourse } from './AdminCoursePanel';
import AdminRequestPanel, { type ManagedRequest } from './AdminRequestPanel';
import { api } from '@/shared/api';
import { setDraftOwner } from '@/shared/drafts';
import { LocaleProvider } from '@/i18n/LocaleContext';
import { adminEditorEnglish } from '@/i18n/adminEditor';
import { globalEnglish } from '@/i18n/global';

vi.mock('@/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 90, is_admin: true } }) }));
vi.mock('@/shared/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
const course: ManagedCourse = {
  id: 12,
  title: 'Original',
  description: 'Working summary',
  owner_id: 5,
  organization_id: 2,
  status: 'ready',
  publication_status: 'published',
  content_revision: 7,
  is_deleted: false,
  state_token: 'a'.repeat(64),
};
const changed = vi.fn();
function courses(row = course) {
  return render(
    <MemoryRouter>
      <AdminCoursePanel
        courses={[row]}
        users={[]}
        archived={row.is_deleted}
        setArchived={vi.fn()}
        onChanged={changed}
        userSearch=''
        setUserSearch={vi.fn()}
      />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  localStorage.clear();
  setDraftOwner(90);
  vi.resetAllMocks();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  setDraftOwner(null);
});

it('keeps a course edit after a conflict and resuming the page, with the original concurrency token', async () => {
  vi.mocked(api.put).mockRejectedValue(new Error('Changed by another operator'));
  const view = courses();
  fireEvent.click(screen.getByRole('button', { name: 'Изменить метаданные' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Название курса' }), {
    target: { value: 'My unsaved revision' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить курс' }));
  await screen.findByRole('alert');
  expect(api.put).toHaveBeenCalledWith('/admin/courses/12', {
    title: 'My unsaved revision',
    description: 'Working summary',
    expected_state: course.state_token,
  });
  expect(changed).not.toHaveBeenCalled();
  view.unmount();
  courses();
  expect(screen.getByRole('textbox', { name: 'Название курса' })).toHaveValue(
    'My unsaved revision',
  );
});

it('archives only after an explicit confirmation and restores using the archived snapshot token', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: {} });
  const view = courses();
  fireEvent.click(screen.getByRole('button', { name: 'Архивировать' }));
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }));
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  expect(api.post).toHaveBeenCalledWith('/admin/courses/12/archive', {
    expected_state: course.state_token,
  });
  view.unmount();
  courses({ ...course, is_deleted: true, state_token: 'b'.repeat(64) });
  fireEvent.click(screen.getByRole('button', { name: 'Восстановить' }));
  fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }));
  await waitFor(() =>
    expect(api.post).toHaveBeenLastCalledWith('/admin/courses/12/restore', {
      expected_state: 'b'.repeat(64),
    }),
  );
});

it('reads the request history and sends workflow changes without replacing the original message', async () => {
  const row: ManagedRequest = {
    reference: 'request-one',
    purpose: 'support',
    email: 'customer@example.test',
    name: 'Customer',
    message: 'Original incoming message',
    created_at: '2026-10-22T12:00:00',
    status: 'archived',
    state_token: 'c'.repeat(64),
  };
  vi.mocked(api.get).mockResolvedValue({
    data: {
      ...row,
      notes: [{ id: 1, text: 'Previous operator note', created_at: row.created_at }],
    },
  });
  vi.mocked(api.put).mockResolvedValue({ data: {} });
  render(
    <MemoryRouter>
      <AdminRequestPanel
        requests={[row]}
        status='archived'
        setStatus={vi.fn()}
        onChanged={changed}
        loading={false}
      />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Восстановить и обработать' }));
  await screen.findByText('Previous operator note');
  fireEvent.change(screen.getByRole('textbox', { name: 'Комментарий оператора' }), {
    target: { value: 'New processing note' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить обработку' }));
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/admin/requests/request-one', {
      status: 'open',
      note: 'New processing note',
      expected_state: row.state_token,
    }),
  );
  expect(api.put).not.toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ message: expect.anything() }),
  );
});

it('uses the fresh request status with its concurrency token when a card became stale', async () => {
  const row: ManagedRequest = { reference: 'closed-elsewhere', purpose: 'support', email: 'customer@example.test', name: 'Customer',
    message: 'Original incoming message', created_at: '2026-10-22T12:00:00', status: 'open', state_token: 'old'.repeat(21) + 'x' };
  vi.mocked(api.get).mockResolvedValue({ data: { ...row, status: 'closed', state_token: 'd'.repeat(64), notes: [] } });
  vi.mocked(api.put).mockResolvedValue({ data: {} });
  render(<MemoryRouter><AdminRequestPanel requests={[row]} status="open" setStatus={vi.fn()} onChanged={changed} loading={false} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Обработать обращение' }));
  const state = await screen.findByRole('combobox', { name: 'Состояние' });
  expect(state).toHaveValue('closed');
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить обработку' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/admin/requests/closed-elsewhere', {
    status: 'closed', note: '', expected_state: 'd'.repeat(64),
  }));
});

it('requires explicit comparison before rebasing a conflicting course draft', async () => {
  vi.mocked(api.put).mockRejectedValueOnce(new Error('Changed elsewhere')).mockResolvedValueOnce({ data: {} });
  vi.mocked(api.get).mockResolvedValue({ data: { ...course, title: 'Someone else’s title', state_token: 'e'.repeat(64) } });
  courses();
  fireEvent.click(screen.getByRole('button', { name: 'Изменить метаданные' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Название курса' }), { target: { value: 'My title' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить курс' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Сравнить с текущей записью' }));
  await screen.findByText('Someone else’s title');
  expect(screen.getByRole('textbox', { name: 'Название курса' })).toHaveValue('My title');
  expect(api.put).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить мои поля поверх этой версии' }));
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить курс' }));
  await waitFor(() => expect(api.put).toHaveBeenLastCalledWith('/admin/courses/12', {
    title: 'My title', description: course.description, expected_state: 'e'.repeat(64),
  }));
});

it('translates management controls while preserving the customer’s course text', () => {
  localStorage.setItem('lernium_locale', 'en');
  render(<LocaleProvider dictionaries={{ en: { ...globalEnglish, ...adminEditorEnglish } }}><MemoryRouter>
    <AdminCoursePanel courses={[{ ...course, title: 'Название заказчика', description: 'Описание заказчика' }]} users={[]}
      archived={false} setArchived={vi.fn()} onChanged={changed} userSearch="" setUserSearch={vi.fn()} />
  </MemoryRouter></LocaleProvider>);
  expect(screen.getByText('Название заказчика')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Edit metadata' }));
  expect(screen.getByRole('textbox', { name: 'Course description' })).toHaveValue('Описание заказчика');
  expect(screen.getByRole('button', { name: 'Save course' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Archive' })).toBeVisible();
});
