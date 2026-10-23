import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { api } from '@/shared/api';
import BusinessPage from './BusinessPage';
const state = vi.hoisted(() => ({ role: 'owner' }));
vi.mock('@/shared/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      organization_id: 2,
      organization_kind: 'business',
      organization_role: state.role,
    },
  }),
}));
vi.mock('../Workspace/shared', () => ({
  Shell: ({ children, action }: { children: ReactNode; action: ReactNode }) => (
    <main>
      {action}
      {children}
    </main>
  ),
  CopyLink: ({ url }: { url: string }) => (
    <input aria-label='Invitation URL' value={url} readOnly />
  ),
  styles: {},
  statuses: { published: 'Опубликован' },
  errorText: (e: unknown) => (e instanceof Error ? e.message : 'Ошибка'),
}));
const position = {
  id: 10,
  name: 'Специалист поддержки',
  description: 'Работа с клиентами',
  responsibilities: 'Решать обращения',
  competencies: 'Проверять решения',
  revision: 3,
  is_archived: false,
  employee_count: 1,
  course_count: 1,
};
function open(path = '/company?tab=positions') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path='/company' element={<BusinessPage />} />
        <Route path='/company/positions/:positionId' element={<BusinessPage />} />
        <Route path='/express' element={<h1>Course wizard</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  state.role = 'owner';
  vi.mocked(api.get).mockImplementation(
    async (path) =>
      ({
        data:
          path === '/business/dashboard'
            ? {
                scope: state.role === 'owner' ? 'company' : 'team',
                company_name: 'Company',
                employees: 1,
                candidates: 1,
                unassigned: 0,
                metrics: {
                  assigned: 2,
                  completed: 1,
                  in_progress: 1,
                  overdue: 0,
                  pending_reviews: 0,
                },
                managers:
                  state.role === 'owner'
                    ? [
                        {
                          id: 8,
                          full_name: 'Анна',
                          email: 'manager@example.test',
                          is_active: true,
                          employees: 1,
                          candidates: 1,
                          assigned: 2,
                          completed: 1,
                        },
                      ]
                    : [],
              }
            : path === '/business/positions/10'
              ? position
              : path.includes('/regulations')
                ? {
                    total: 1,
                    items: [
                      {
                        id: 50,
                        name: 'Поддержка клиентов',
                        status: 'ready',
                        publication_status: 'published',
                        content_revision: 4,
                      },
                    ],
                  }
                : path.includes('/positions')
                  ? { total: 1, items: [position] }
                  : path.includes('/employees')
                    ? {
                        total: 1,
                        items: [
                          {
                            id: 2,
                            email: 'employee@example.test',
                            full_name: 'Иван',
                            organization_role: path.includes('role=candidate')
                              ? 'candidate'
                              : 'member',
                            is_active: true,
                            auth_version: 4,
                            position_id: null,
                            manager_id: 8,
                          },
                        ],
                      }
                    : { items: [] },
      }) as never,
  );
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('owner invites a manager with no employee position or password', async () => {
  vi.mocked(api.post).mockResolvedValue({
    data: { url: 'https://example.test/invite#token=opaque', mail_status: 'queued' },
  });
  open('/company?tab=employees');
  fireEvent.click(await screen.findByRole('button', { name: 'Добавить сотрудника' }));
  fireEvent.change(screen.getByLabelText('Электронная почта'), {
    target: { value: 'manager@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Роль'), { target: { value: 'manager' } });
  expect(screen.queryByLabelText('Должность')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Создать приглашение' }));
  await screen.findByLabelText('Invitation URL');
  expect(api.post).toHaveBeenCalledWith('/business/invitations', {
    email: 'manager@example.test',
    role: 'manager',
    position_id: null,
    manager_id: null,
    locale: 'ru',
  });
});
it('manager creates a named regulation without curriculum settings', async () => {
  state.role = 'manager';
  vi.mocked(api.post).mockResolvedValue({ data: { url: '/express?course=51&step=1' } });
  open();
  fireEvent.click(await screen.findByRole('button', { name: 'Открыть должность' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Добавить регламент' }));
  expect(screen.getByLabelText('Название регламента')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Название регламента'), {
    target: { value: '01. Сервис' },
  });
  fireEvent.change(screen.getByLabelText('Что регулирует документ'), {
    target: { value: 'Общение с клиентами' },
  });
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Добавить материалы' }));
  await screen.findByRole('heading', { name: 'Course wizard' });
  expect(api.post).toHaveBeenCalledWith(
    '/business/positions/10/regulations',
    expect.objectContaining({ expected_position_revision: 3, title: '01. Сервис', language: 'ru' }),
  );
});
it('manager cannot appoint another manager and changes employee position with conflict protection', async () => {
  state.role = 'manager';
  vi.mocked(api.put).mockResolvedValue({ data: {} });
  open();
  fireEvent.click(screen.getByRole('tab', { name: 'Сотрудники' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Настроить доступ: Иван' }));
  const picker = await screen.findByLabelText('Должность: employee@example.test');
  await waitFor(() => expect(picker).toBeEnabled());
  expect(screen.queryByRole('button', { name: 'Назначить управляющим' })).not.toBeInTheDocument();
  fireEvent.change(picker, { target: { value: '10' } });
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/business/employees/2/position', {
      position_id: 10,
      expected_position_id: null,
    }),
  );
});
it('a revision conflict preserves the edited job profile for correction', async () => {
  vi.mocked(api.put).mockRejectedValue(new Error('Должность уже изменена'));
  open();
  fireEvent.click(await screen.findByLabelText('Действия: Специалист поддержки'));
  fireEvent.click(await screen.findByRole('button', { name: 'Изменить' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByText('Обязанности и навыки'));
  fireEvent.change(within(dialog).getByLabelText('Основные обязанности'), {
    target: { value: 'Мой подробный черновик' },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить должность' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Основные обязанности')).toHaveValue('Мой подробный черновик');
});
it('assigns a published course only after explicit confirmation', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { created: 1, already_assigned: 0 } });
  open();
  fireEvent.click(await screen.findByRole('button', { name: 'Открыть должность' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Назначить команде' }));
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Назначить регламент' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Назначено: 1');
  expect(api.post).toHaveBeenCalledWith('/business/positions/10/regulations/50/assign', {
    expected_revision: 3,
  });
});

it('opens a position directly after reload and preserves material names', async () => {
  state.role = 'manager';
  open('/company/positions/10');
  expect(await screen.findByRole('heading', { name: 'Поддержка клиентов' })).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Открыть регламент' })).toHaveAttribute(
    'href',
    '/courses/50/edit?position=10',
  );
});

it('owner starts with company dashboard and every manager team', async () => {
  open('/company');
  expect(
    await screen.findByRole('heading', { name: 'Подготовка всей компании' }),
  ).toBeInTheDocument();
  expect(await screen.findByText('Анна')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Кандидаты ↗' })).toHaveAttribute(
    'href',
    '/company?tab=candidates&manager_id=8',
  );
  expect(screen.getByRole('link', { name: 'Управлять руководителями ↗' })).toBeInTheDocument();
});

it('manager invites a candidate into their own team without manager controls', async () => {
  state.role = 'manager';
  vi.mocked(api.post).mockResolvedValue({
    data: { url: 'https://example.test/invite#token=candidate', mail_status: 'queued' },
  });
  open('/company?tab=candidates');
  fireEvent.click(await screen.findByRole('button', { name: 'Добавить кандидата' }));
  expect(screen.getByLabelText('Роль')).toHaveValue('candidate');
  expect(screen.queryByRole('option', { name: 'Руководитель' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Руководитель')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Электронная почта'), {
    target: { value: 'candidate@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Создать приглашение' }));
  await screen.findByLabelText('Invitation URL');
  expect(api.post).toHaveBeenCalledWith(
    '/business/invitations',
    expect.objectContaining({ role: 'candidate', manager_id: null }),
  );
});

it('candidate conversion and owner reporting-line changes use current versions', async () => {
  vi.mocked(api.put).mockResolvedValue({ data: {} });
  open('/company?tab=candidates');
  fireEvent.click(await screen.findByRole('button', { name: 'Настроить доступ: Иван' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Принять в сотрудники' }));
  fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }));
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/business/employees/2/role', {
      role: 'member',
      expected_auth_version: 4,
    }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  fireEvent.click(await screen.findByRole('button', { name: 'Настроить доступ: Иван' }));
  fireEvent.change(await screen.findByLabelText('Руководитель: employee@example.test'), {
    target: { value: '' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }));
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/business/employees/2/reporting-line', {
      manager_id: null,
      expected_manager_id: 8,
      expected_auth_version: 4,
    }),
  );
});

it('manager lands on job roles and opens invitations only from personnel actions', async () => {
  state.role = 'manager';
  open('/company');
  expect(await screen.findByRole('tab', { name: 'Должности' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(screen.getByRole('button', { name: 'Добавить должность' })).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Сотрудники' }));
  fireEvent.click(screen.getByRole('button', { name: 'Добавить сотрудника' }));
  expect(screen.getByRole('dialog', { name: 'Приглашение в компанию' })).toBeInTheDocument();
});

it('queued mail is not presented as delivered and the invitation remains available to copy', async () => {
  state.role = 'manager';
  vi.mocked(api.post).mockResolvedValue({
    data: { url: 'https://example.test/invite#token=opaque', mail_status: 'queued' },
  });
  open('/company?tab=employees');
  fireEvent.click(await screen.findByRole('button', { name: 'Добавить сотрудника' }));
  fireEvent.change(screen.getByLabelText('Электронная почта'), {
    target: { value: 'new@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Создать приглашение' }));
  expect(await screen.findByRole('dialog', { name: 'Приглашение готово' })).toBeInTheDocument();
  expect(screen.getByLabelText('Invitation URL')).toHaveValue(
    'https://example.test/invite#token=opaque',
  );
  expect(screen.getByText('Приглашение создано. Письмо готовится к отправке.')).toBeInTheDocument();
  expect(screen.queryByText('Приглашение отправлено на почту')).not.toBeInTheDocument();
});
