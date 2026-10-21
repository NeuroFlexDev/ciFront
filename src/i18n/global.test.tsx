import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CourseWizard from '@/Pages/ExpressPage/CourseWizard';
import { RequestError } from '@/Components/RequestState';
import { ApiError } from '@/shared/errors';
import { api } from '@/shared/api';
import { setDraftOwner } from '@/shared/drafts';
import { LocaleProvider } from './LocaleContext';
import { globalEnglish } from './global';
import { learningEnglish } from './learning';
import { LOCALE_STORAGE_KEY } from './locale';
import { dateText } from '@/Pages/Workspace/shared';

vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 820,
      email: 'test@example.invalid',
      organization_id: 9,
      organization_role: 'reviewer',
    },
    logout: vi.fn(),
  }),
}));
vi.mock('@/shared/api', () => ({
  getAuthToken: () => 'i18n-test-session',
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));
beforeEach(() => {
  localStorage.clear();
  setDraftOwner(820);
  vi.mocked(api.get).mockImplementation(async (path) => ({
    data:
      path === '/team/permissions'
        ? {
            can_manage_team: false,
            can_author: true,
            can_review: true,
            can_report: false,
          }
        : path.includes('capabilities')
          ? {
              document_formats: ['pdf'],
              document_max_bytes: 26214400,
              source_characters_limit: 500000,
            }
          : path.includes('generation-settings')
            ? {
                title: 'Авторский русский заголовок',
                goal: 'Авторская цель',
                target_audience: 'Студенты',
                difficulty: 'basic',
                language: 'ru',
                lesson_count: 2,
                module_tests_enabled: true,
                final_test_enabled: true,
                revision: 3,
              }
            : { items: [], total: 0 },
  }));
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  setDraftOwner(null);
  localStorage.clear();
});

it('switches navigation and wizard text while preserving author input and exposing course review navigation', async () => {
  render(
    <MemoryRouter initialEntries={['/express?course=8']}>
      <LocaleProvider dictionaries={{ en: globalEnglish }}>
        <CourseWizard />
      </LocaleProvider>
    </MemoryRouter>,
  );
  const title = await screen.findByLabelText('Название курса');
  await waitFor(() => expect(title).toHaveValue('Авторский русский заголовок'));
  fireEvent.change(title, { target: { value: 'Моя новая формулировка' } });
  fireEvent.change(screen.getByLabelText('Язык интерфейса'), {
    target: { value: 'en' },
  });
  expect(screen.getByLabelText('Course title')).toHaveValue('Моя новая формулировка');
  expect(screen.getByRole('link', { name: 'Course approval', hidden: true })).toHaveAttribute(
    'href',
    '/course-reviews',
  );
  expect(screen.getByRole('button', { name: 'Step 3 Course setup' })).toBeInTheDocument();
  expect(screen.getByLabelText('Course language')).toHaveValue('ru');
  expect(api.put).not.toHaveBeenCalled();
  expect(api.post).not.toHaveBeenCalled();
  expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
});

it('explains unknown server errors in English and keeps the exact original details available', () => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  render(
    <LocaleProvider dictionaries={{ en: globalEnglish }}>
      <RequestError error={new ApiError('Специальная ошибка: не терять детали', 409)} />
    </LocaleProvider>,
  );
  expect(screen.getByRole('heading')).toHaveTextContent('Content has changed');
  expect(screen.getByText('Original server message')).toBeInTheDocument();
  expect(screen.getByText('Специальная ошибка: не терять детали')).toHaveAttribute('lang', 'ru');
  expect(screen.getByText(/Check your input and retry/)).toBeInTheDocument();
});

it('retains all placeholders and formats dates according to the chosen interface language', () => {
  for (const [ru, en] of Object.entries({
    ...learningEnglish,
    ...globalEnglish,
  })) {
    const placeholders = (value: string) =>
      Array.from(new Set(value.match(/\{\w+\}/g) ?? [])).sort();
    expect(placeholders(en), ru).toEqual(placeholders(ru));
  }
  const date = '2026-10-21T12:00:00Z';
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  expect(dateText(date)).toBe(new Date(date).toLocaleString('en-GB'));
  localStorage.setItem(LOCALE_STORAGE_KEY, 'ru');
  expect(dateText(date)).toBe(new Date(date).toLocaleString('ru-RU'));
});
