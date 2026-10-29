import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { api } from '@/shared/api';
import LearningResults from './LearningResults';

vi.mock('@/shared/api', () => ({ api: { get: vi.fn() } }));
vi.mock('../Workspace/shared', () => ({
  styles: {},
  Shell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
const assignment = {
  id: 12,
  title: 'Сервис',
  state: 'active',
  status: 'in_progress',
  rules: { pass_percent: 70, max_attempts: 3 },
};
const responses = [
  {
    id: 1,
    assessment_id: 'test:5',
    status: 'reviewed',
    points: 9,
    max_points: 10,
    attempt: 1,
    can_retry: false,
    submitted_at: '2026-10-28T12:00:00Z',
  },
  {
    id: 2,
    assessment_id: 'practice/6',
    status: 'pending_review',
    points: null,
    max_points: 10,
    attempt: 1,
    can_retry: false,
    submitted_at: '2026-10-28T13:00:00Z',
  },
  {
    id: 3,
    assessment_id: 'test:7',
    status: 'reviewed',
    points: 4,
    max_points: 10,
    attempt: 1,
    can_retry: true,
    submitted_at: '2026-10-28T14:00:00Z',
  },
  {
    id: 4,
    assessment_id: 'test:8',
    status: 'draft',
    points: null,
    max_points: 10,
    attempt: 1,
    can_retry: false,
    submitted_at: null,
  },
];
beforeEach(() => {
  vi.mocked(api.get).mockImplementation(
    async (path) =>
      ({
        data: path.endsWith('/results') ? { responses } : { items: [assignment], total: 1 },
      }) as never,
  );
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function open() {
  render(
    <MemoryRouter>
      <LearningResults />
    </MemoryRouter>,
  );
}

it('links to the existing assessment without starting a new attempt and excludes drafts', async () => {
  open();
  expect(await screen.findByText('90%')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Пройти снова' })).toHaveAttribute(
    'href',
    '/learning/12?item=test%3A7',
  );
  expect(screen.getAllByRole('link', { name: 'Открыть' })).toHaveLength(2);
  expect(screen.getAllByRole('row')).toHaveLength(4);
  expect(screen.getByText('На проверке')).toBeVisible();
  expect(api.get).toHaveBeenCalledWith('/learning/assignments/12/results');
});

it('keeps a failed result read distinct from an empty list and can retry', async () => {
  let failed = true;
  vi.mocked(api.get).mockImplementation(async (path) => {
    if (path.endsWith('/results') && failed) throw new TypeError('Failed to fetch');
    return {
      data: path.endsWith('/results') ? { responses } : { items: [assignment], total: 1 },
    } as never;
  });
  open();
  const retry = await screen.findByRole('button', { name: 'Повторить загрузку' });
  expect(screen.queryByText('Результаты появятся после первого задания')).not.toBeInTheDocument();
  failed = false;
  fireEvent.click(retry);
  await waitFor(() => expect(screen.getByText('90%')).toBeVisible());
});


it('preserves results of revoked assignments with a read-only history link', async () => {
  vi.mocked(api.get).mockImplementation(async path => ({ data: path.endsWith('/results')
    ? { responses: [responses[0]] }
    : { items: [{ ...assignment, state: 'revoked', status: 'revoked' }], total: 1 } }) as never);
  open();
  expect(await screen.findByRole('link', { name: 'Открыть' })).toHaveAttribute('href', '/learning/12?view=results');
  expect(screen.queryByRole('link', { name: 'Пройти снова' })).not.toBeInTheDocument();
});
