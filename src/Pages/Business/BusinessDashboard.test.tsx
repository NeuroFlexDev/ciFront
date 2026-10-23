import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { api } from '@/shared/api';
import BusinessDashboard, { type BusinessOverview } from './BusinessDashboard';
import type { LearningDashboardData } from '@/Pages/Workspace/LearningDashboard';

vi.mock('@/shared/api', () => ({ api: { get: vi.fn() } }));
const overview: BusinessOverview = {
  scope: 'team',
  company_name: 'Be Slim',
  employees: 2,
  candidates: 1,
  unassigned: 0,
  metrics: { assigned: 4, completed: 3, in_progress: 1, pending_reviews: 0, overdue: 0 },
  managers: [],
};
const learning: LearningDashboardData = {
  scope: 'authorized_team',
  period_days: 30,
  activity_days: 7,
  as_of: '2026-10-23T12:00:00Z',
  metrics: {
    assignments_in_period: 2,
    completed_in_period: 1,
    completion_percent: 50,
    average_completion_hours: 15,
    courses: 6,
    people: 3,
    active_assignments: 4,
    completed_lessons: 2,
    assigned_lessons: 8,
    lesson_completion_percent: 25,
    pending_review: 0,
    submitted_attempts: 5,
  },
  daily: [{ date: '2026-10-23', submitted_attempts: 5 }],
};
function open(data = overview) {
  render(
    <MemoryRouter>
      <BusinessDashboard data={data} />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue({ data: learning });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it('separates period completion from all assignments and counts employees without candidates', async () => {
  open();
  expect(await screen.findByText('50%')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Регламенты изучены: 3 из 4. Открыть результаты' }),
  ).toHaveTextContent('75%');
  expect(
    within(screen.getByRole('region', { name: 'Сотрудники' })).getByText('2'),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Кандидаты: 1/ })).toHaveAttribute(
    'href',
    '/company?tab=candidates',
  );
  expect(screen.queryByText('25%')).not.toBeInTheDocument();
  expect(screen.queryByText('Руководители и их команды')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Создать регламент' })).toHaveAttribute(
    'href',
    '/company?tab=positions',
  );
});

it('requests the selected periods without relabelling stale values or showing failed metrics as zero', async () => {
  open();
  await screen.findByText('50%');
  let resolve!: (value: { data: LearningDashboardData }) => void;
  vi.mocked(api.get).mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }) as never,
  );
  fireEvent.change(screen.getByLabelText('Период назначений'), { target: { value: '7' } });
  await waitFor(() =>
    expect(api.get).toHaveBeenLastCalledWith('/learning/dashboard?days=7&activity_days=7'),
  );
  expect(screen.queryByText('50%')).not.toBeInTheDocument();
  resolve({
    data: {
      ...learning,
      period_days: 7,
      metrics: { ...learning.metrics, completion_percent: 100 },
    },
  });
  await screen.findByText('100%');
  vi.mocked(api.get).mockRejectedValueOnce(new Error('Connection failed'));
  fireEvent.change(screen.getByLabelText('Период активности'), { target: { value: '14' } });
  await waitFor(() =>
    expect(api.get).toHaveBeenLastCalledWith('/learning/dashboard?days=7&activity_days=14'),
  );
  await screen.findByRole('button', { name: /Повторить/ });
  expect(screen.queryByText('100%')).not.toBeInTheDocument();
  expect(screen.getByText('75%')).toBeInTheDocument();
});

it('uses honest empty states for a company with no assignments or answers', async () => {
  vi.mocked(api.get).mockResolvedValue({
    data: {
      ...learning,
      metrics: {
        ...learning.metrics,
        assignments_in_period: 0,
        completed_in_period: 0,
        completion_percent: null,
        average_completion_hours: null,
        submitted_attempts: 0,
        courses: 0,
      },
      daily: [],
    },
  });
  open({ ...overview, metrics: { ...overview.metrics, assigned: 0, completed: 0 } });
  await screen.findByText('Нет назначений');
  expect(screen.getByText('Ответов пока нет')).toBeInTheDocument();
  expect(screen.queryByText('0%')).not.toBeInTheDocument();
  expect(screen.queryByText('50%')).not.toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Регламенты изучены: 0 из 0. Открыть результаты' }),
  ).toHaveTextContent('—');
});
