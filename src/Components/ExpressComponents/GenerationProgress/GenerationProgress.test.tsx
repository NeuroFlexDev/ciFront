import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { api } from '@/shared/api';
import { LocaleProvider } from '@/i18n/LocaleContext';
import { generationEnglish } from '@/i18n/generation';
import GenerationProgress from './GenerationProgress';
import { type GenerationRun, readGenerationPlan } from './types';
vi.mock('@/shared/api', () => ({ api: { get: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-22T10:02:00Z'));
  localStorage.clear();
  vi.mocked(api.get).mockResolvedValue({ data: [] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});
const run: GenerationRun = {
  run_id: 8,
  course_id: 33,
  status: 'running',
  progress_percent: 50,
  current_stage: 'lesson_writing',
  started_at: '2026-10-22T10:00:00',
  stages: [
    { code: 'course_architecture', title: 'Архитектура курса', status: 'completed' },
    { code: 'lesson_writing', title: 'Написание уроков', status: 'running' },
    { code: 'assessment_generation', title: 'Оценочные материалы', status: 'pending' },
  ],
};
const actions = () => ({
  onRefresh: vi.fn(),
  onResume: vi.fn(),
  onCancel: vi.fn(),
  onEditSettings: vi.fn(),
  onRetrySubmission: vi.fn(),
});
const page = (props: Partial<React.ComponentProps<typeof GenerationProgress>> = {}) =>
  render(
    <MemoryRouter>
      <LocaleProvider dictionaries={{ en: generationEnglish }}>
        <GenerationProgress
          run={run}
          courseId={33}
          connection='connected'
          {...actions()}
          {...props}
        />
      </LocaleProvider>
    </MemoryRouter>,
  );

it('updates real elapsed time but never advances the server percentage on a timer', async () => {
  page();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  expect(screen.getByText('02:00')).toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(15000));
  expect(screen.getByText('02:15')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  expect(screen.queryByText(/ETA|осталось.*минут/i)).not.toBeInTheDocument();
});

it('shows an indeterminate pending acceptance with no invented completion or stop action', () => {
  page({ run: null, submission: 'submitting', busy: true });
  expect(screen.getByRole('heading', { name: 'Запускаем генерацию' })).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  expect(screen.queryByRole('button', { name: /Остановить/ })).not.toBeInTheDocument();
  expect(screen.getAllByText('Ожидание')).toHaveLength(7);
});

it('shows a paused stage, keeps confirmed progress, and only resumes on explicit action', async () => {
  const callbacks = actions();
  page({ ...callbacks, run: { ...run, status: 'paused', finished_at: '2026-10-22T10:01:00Z' } });
  expect(screen.getByRole('heading', { name: 'Прогресс сохранён' })).toBeInTheDocument();
  const stages = screen.getByRole('list', { name: 'Этапы генерации' });
  expect(within(stages).getByText('На паузе')).toBeInTheDocument();
  expect(within(stages).queryByText('В работе')).not.toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(60000));
  expect(screen.getByText('01:00')).toBeInTheDocument();
  expect(callbacks.onResume).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить генерацию' }));
  expect(callbacks.onResume).toHaveBeenCalledOnce();
});

it('does not present disconnected progress as live or offer a duplicate launch', () => {
  page({ connection: 'reconnecting', receivedAt: Date.now() });
  expect(screen.getByText('Последний подтверждённый прогресс')).toBeInTheDocument();
  expect(screen.getByText('Восстанавливаем связь')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Остановить после текущего этапа' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Повторить генерацию' })).not.toBeInTheDocument();
});

it('renders only the completed plan for this run and safely treats model titles as text', async () => {
  vi.mocked(api.get).mockResolvedValue({
    data: [
      {
        run_id: 9,
        artifact: 'course_plan',
        status: 'completed',
        sequence: 100,
        payload: { title: 'OTHER COURSE', modules: [], lessons: [] },
      },
      {
        run_id: 8,
        artifact: 'course_plan',
        status: 'completed',
        sequence: 1,
        payload: {
          title: '<img src=x onerror=alert(1)>',
          modules: [{ id: 'm1', title: 'Real module', lesson_ids: ['l1'] }],
          lessons: [{ id: 'l1', title: 'Real lesson' }],
        },
      },
    ],
  });
  page();
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.getByText('Real module')).toBeInTheDocument();
  expect(screen.getByText('Real lesson')).toBeInTheDocument();
  expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  expect(screen.queryByText('OTHER COURSE')).not.toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

it('chooses the latest successful course plan and ignores failed repair payloads', () => {
  const entry = (sequence: number, status: string, title: string) => ({
    run_id: 8,
    artifact: 'course_plan',
    sequence,
    status,
    payload: {
      title,
      modules: [{ id: 'm1', title: 'Module', lesson_ids: ['l1'] }],
      lessons: [{ id: 'l1', title: 'Lesson' }],
    },
  });
  expect(
    readGenerationPlan(
      [
        entry(0, 'completed', 'First'),
        entry(2, 'failed', 'Bad'),
        entry(1, 'completed', 'Repaired'),
      ],
      8,
    )?.title,
  ).toBe('Repaired');
});

it('renders English interface labels while keeping generated course content intact', async () => {
  localStorage.setItem('lernium_locale', 'en');
  page({ run: { ...run, settings_snapshot: { title: 'Курс заказчика' } } });
  expect(screen.getByRole('heading', { name: 'Generating your course' })).toBeInTheDocument();
  expect(screen.getByText('Курс заказчика')).toBeInTheDocument();
  expect(screen.getByText('Stage progress')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Stop after the current stage' })).toBeInTheDocument();
  await act(async () => {
    await Promise.resolve();
  });
});
