import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import AdminPage from '@/Pages/AdminPage/AdminPage';
import DeliveryPage from '@/Pages/AdminPage/DeliveryPage';
import CourseEditPage from '@/Components/CourseEditPage/CourseEditPage';
import { ProtectedImage } from '@/Components/MarkdownContent';
import DraftNotice from '@/Components/DraftNotice';
import { LocaleProvider } from '@/i18n/LocaleContext';
import { useLocale } from '@/i18n/useLocale';
import { aiControlEnglish } from '@/i18n/aiControl';
import { adminEditorEnglish } from '@/i18n/adminEditor';
import { globalEnglish } from '@/i18n/global';
import { materialsEnglish } from '@/i18n/materials';
import { integrationsEnglish } from '@/i18n/integrations';
import { publicationEnglish } from '@/i18n/publication';
const mocked = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock('@/shared/api', () => ({ api: mocked, apiFetch: mocked.fetch }));
vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 9, is_admin: true, organization_id: 1 } }),
}));
vi.mock('@/Components/Menu/Menu', () => ({ default: () => null }));
vi.mock('@/Pages/ExpressPage/CourseWizard', () => ({
  WizardSteps: () => null,
}));
vi.mock('@/Pages/Learning/CourseReviewsPage', () => ({
  PublicationHistory: () => null,
}));
function SwitchLanguage() {
  const { setLocale } = useLocale();
  return <button onClick={() => setLocale('ru')}>Switch language</button>;
}
function Page({
  children,
  path = '/admin',
  route = '/admin',
}: {
  children: ReactNode;
  path?: string;
  route?: string;
}) {
  return (
    <LocaleProvider
      dictionaries={{
        en: {
          ...globalEnglish,
          ...materialsEnglish,
          ...integrationsEnglish,
          ...publicationEnglish,
          ...adminEditorEnglish,
          ...aiControlEnglish,
        },
      }}
    >
      <SwitchLanguage />
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={children} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>
  );
}
beforeEach(() => {
  Object.values(mocked).forEach((fn) => fn.mockReset());
  localStorage.clear();
  localStorage.setItem('lernium_locale', 'en');
});
afterEach(cleanup);

it('sends the chosen invitation locale and translates dynamic role and audit labels without translating customer data', async () => {
  mocked.get.mockImplementation(async (path: string) => ({
    data: path.startsWith('/admin/organizations')
      ? {
          items: [
            {
              id: 1,
              name: 'ООО Исходное имя',
              kind: 'education',
              is_active: true,
            },
          ],
          total: 1,
        }
      : path.startsWith('/admin/audit')
        ? {
            items: [
              {
                id: 1,
                action: 'organization.created',
                target_type: 'organization',
                target_id: '1',
                details: { name: 'ООО Исходное имя' },
                created_at: '2026-10-21T12:00:00',
              },
            ],
            total: 1,
          }
        : { items: [], total: 0 },
  }));
  mocked.post.mockResolvedValue({
    data: { url: 'https://example.test/invite/token', mail_status: 'queued' },
  });
  render(
    <Page path='/admin?tab=invitations'>
      <AdminPage />
    </Page>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Invite user' }));
  expect(await screen.findByRole('option', { name: 'ООО Исходное имя' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Organization owner' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Organization'), {
    target: { value: '1' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'recipient@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create invitation' }));
  await waitFor(() =>
    expect(mocked.post).toHaveBeenCalledWith(
      '/admin/invitations',
      expect.objectContaining({
        locale: 'en',
        email: 'recipient@example.test',
        organization_id: 1,
      }),
    ),
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Close dialog' }));
  fireEvent.click(screen.getByRole('tab', { name: 'Activity log' }));
  expect(await screen.findByText('Customer created')).toBeInTheDocument();
  expect(screen.getByText(/ООО Исходное имя/)).toBeInTheDocument();
});

it('translates delivery profiles and quota labels while preserving administrator context fields', async () => {
  mocked.get.mockImplementation(async (path: string) => ({
    data: path.includes('material-policy')
      ? {
          disk_bytes_limit: 1024 ** 3,
          image_monthly_limit: 20,
          chat_monthly_limit: 30,
          used_disk_bytes: 1024 ** 3 / 2,
        }
      : {
          revision: 1,
          profile: 'education',
          languages: ['ru', 'en'],
          features: { images: true },
          delivery: {},
          role_labels: {},
          ai_context: { industry: 'Железная дорога' },
        },
  }));
  render(
    <Page
      path='/admin/organizations/1/delivery'
      route='/admin/organizations/:organizationId/delivery'
    >
      <DeliveryPage />
    </Page>,
  );
  expect(await screen.findByLabelText('Industry')).toHaveValue('Железная дорога');
  expect(screen.getByLabelText('Image upload and generation')).toBeChecked();
  expect(screen.getByLabelText('Storage limit, GiB')).toHaveValue(1);
  fireEvent.change(screen.getByLabelText('Industry'), {
    target: { value: 'Мой несохранённый контекст' },
  });
  fireEvent.click(screen.getByText('Switch language'));
  expect(screen.getByLabelText('Отрасль')).toHaveValue('Мой несохранённый контекст');
  expect(mocked.put).not.toHaveBeenCalled();
});

it('changes editor controls without changing saved lesson text, test answers or an unsaved draft', async () => {
  mocked.get.mockImplementation(async (path: string) => ({
    data: path.endsWith('/structure')
      ? {
          course_id: 2,
          title: 'Исходный русский курс',
          content_revision: 1,
          status: 'draft',
          modules_timeline: [{ module_id: 3 }],
        }
      : path.startsWith('/modules/')
        ? {
            id: 3,
            title: 'Русский модуль',
            revision: 1,
            lessons: [
              {
                id: 4,
                title: 'Русский урок',
                description: 'Описание',
                content: 'Исходный учебный текст',
                revision: 1,
              },
            ],
            tests: [
              {
                id: 5,
                question: 'Исходный вопрос',
                answers: ['Первый', 'Второй'],
                correct_answer: 'Первый',
                revision: 1,
              },
            ],
            tasks: [],
          }
        : path.includes('/source-release')
          ? { items: [], total: 0, can_edit: true, content_revision: 1 }
          : [],
  }));
  render(
    <Page path='/courses/2/edit' route='/courses/:id/edit'>
      <CourseEditPage />
    </Page>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Source' }));
  expect(await screen.findByLabelText('Lesson text (Markdown)')).toHaveValue(
    'Исходный учебный текст',
  );
  expect(screen.getByText('Исходный вопрос')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save lesson' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Lesson text (Markdown)'), {
    target: { value: 'Несохранённый русский текст' },
  });
  fireEvent.click(screen.getByText('Switch language'));
  expect(screen.getByLabelText('Текст урока (Markdown)')).toHaveValue(
    'Несохранённый русский текст',
  );
  expect(screen.getByRole('heading', { name: 'Исходный русский курс' })).toBeInTheDocument();
  expect(mocked.put).not.toHaveBeenCalled();
});

it('localizes protected image failures and draft notices and allows image retry', async () => {
  mocked.fetch.mockResolvedValue({ ok: false, status: 403 });
  render(
    <Page>
      <>
        <ProtectedImage src='/api/images/7/content' alt='Исходное описание' />
        <DraftNotice restored />
      </>
    </Page>,
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'This image is unavailable in your session.',
  );
  expect(
    screen.getByText('An unsaved draft was restored. Review it and save it to the server.'),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reload image' }));
  await waitFor(() => expect(mocked.fetch).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByText('Switch language'));
  expect(
    await screen.findByRole('button', { name: 'Загрузить изображение снова' }),
  ).toBeInTheDocument();
});
