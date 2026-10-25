import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { api } from '@/shared/api';
import { setDraftOwner } from '@/shared/drafts';
import { LocaleProvider } from '@/i18n/LocaleContext';
import { globalEnglish } from '@/i18n/global';
import { integrationsEnglish } from '@/i18n/integrations';
import { persistLocale } from '@/i18n/locale';
import AccountPage from './AccountPage';

const auth = vi.hoisted(() => ({
  logout: vi.fn(),
  user: {
    id: 3,
    full_name: 'Current Person',
    email: 'person@example.test',
    organization_id: 2 as number | null,
    organization_role: 'owner',
  },
}));
vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    user: auth.user,
    logout: auth.logout,
    refreshUser: vi.fn(),
  }),
}));
vi.mock('@/shared/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  apiFetch: vi.fn(),
  getAuthToken: () => null,
  setAuthToken: vi.fn(),
  captureAuthSession: vi.fn(),
  assertAuthSession: vi.fn(),
}));
vi.mock('./IdentityLinks', () => ({ default: () => null }));
vi.mock('./MFASettings', () => ({ default: () => null }));

function team(id = 2, name = 'Connected organization', can_manage = true, role = 'owner') {
  return {
    organization: { id, name, kind: 'business', is_active: true },
    members: [{ id: 3, organization_role: role }],
    can_manage,
  };
}
function otherRead(path: string) {
  if (path === '/team/permissions')
    return {
      data: {
        can_author: false,
        can_review: false,
        can_report: false,
        can_manage_team: false,
      },
    };
  if (path.startsWith('/team/settings'))
    return {
      data: {
        profile: 'business',
        role_labels: {
          owner_ru: 'Руководитель организации',
          owner_en: 'Organization owner',
        },
      },
    };
  if (path === '/legal/me/receipts') return { data: { receipts: [], marketing_active: false } };
  throw new Error(`Unexpected read: ${path}`);
}
beforeEach(() => {
  localStorage.clear();
  persistLocale('ru');
  setDraftOwner(3);
  auth.user = {
    id: 3,
    full_name: 'Current Person',
    email: 'person@example.test',
    organization_id: 2,
    organization_role: 'owner',
  };
  vi.mocked(api.get).mockImplementation(async (path) =>
    path.startsWith('/team?') ? { data: team() } : otherRead(path),
  );
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
  setDraftOwner(null);
  persistLocale('ru');
});
function page() {
  return (
    <MemoryRouter>
      <LocaleProvider dictionaries={{ en: { ...globalEnglish, ...integrationsEnglish } }}>
        <AccountPage />
      </LocaleProvider>
    </MemoryRouter>
  );
}
function organization() {
  return within(
    screen.getByRole('region', {
      name: /Данные организации|Organization details/,
    }),
  );
}

it('shows connected organization metadata and configured role instead of the setup offer', async () => {
  render(page());
  expect(await screen.findByText('Connected organization')).toBeVisible();
  expect(organization().getByText('Компания')).toBeVisible();
  expect(organization().getByText('Руководитель организации')).toBeVisible();
  expect(organization().getByRole('link', { name: 'Открыть команду' })).toHaveAttribute(
    'href',
    '/employees',
  );
  expect(organization().getByRole('link', { name: 'Роли и настройки' })).toHaveAttribute(
    'href',
    '/team-settings',
  );
  expect(screen.queryByText(/Обсудить подключение/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Подключение организации и состав доступа/)).not.toBeInTheDocument();
});

it('uses current team permissions and member role even when cached auth still says owner', async () => {
  vi.mocked(api.get).mockImplementation(async (path) =>
    path.startsWith('/team?')
      ? { data: team(2, 'Connected organization', false, 'member') }
      : otherRead(path),
  );
  render(page());
  await screen.findByText('Connected organization');
  expect(organization().getByText('Сотрудник')).toBeVisible();
  expect(organization().getByRole('link', { name: 'Открыть команду' })).toBeVisible();
  expect(organization().queryByRole('link', { name: 'Роли и настройки' })).not.toBeInTheDocument();
});

it('keeps the setup offer only for a personal account and does not request a team', async () => {
  auth.user.organization_id = null;
  await act(async () => {
    render(page());
  });
  expect(organization().getByText('У вас личный аккаунт')).toBeVisible();
  expect(organization().getByRole('link', { name: 'Обсудить подключение ↗' })).toHaveAttribute(
    'href',
    '/legal/contacts/#request',
  );
  expect(
    vi
      .mocked(api.get)
      .mock.calls.some(([path]) => path.startsWith('/team?') || path.startsWith('/team/settings')),
  ).toBe(false);
});

it('retries organization loading after a network failure without presenting an onboarding offer', async () => {
  let failed = true;
  vi.mocked(api.get).mockImplementation(async (path) => {
    if (!path.startsWith('/team?')) return otherRead(path);
    if (failed) throw new TypeError('Network unavailable');
    return { data: team() };
  });
  render(page());
  const retry = await screen.findByRole('button', {
    name: 'Повторить загрузку',
  });
  expect(organization().getByRole('alert')).toBeVisible();
  expect(screen.queryByText(/Обсудить подключение/)).not.toBeInTheDocument();
  failed = false;
  fireEvent.click(retry);
  expect(await screen.findByText('Connected organization')).toBeVisible();
  expect(organization().queryByRole('alert')).not.toBeInTheDocument();
});

it('clears old metadata when membership changes and never renders a mismatched organization', async () => {
  const view = render(page());
  await screen.findByText('Connected organization');
  let finish!: (response: { data: ReturnType<typeof team> }) => void;
  vi.mocked(api.get).mockImplementation(async (path) =>
    path.startsWith('/team?')
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : otherRead(path),
  );
  auth.user = { ...auth.user, organization_id: 7 };
  view.rerender(page());
  expect(screen.queryByText('Connected organization')).not.toBeInTheDocument();
  expect(organization().getByRole('status')).toBeVisible();
  await act(async () => {
    finish({ data: team(2, 'Wrong organization') });
  });
  expect(screen.queryByText('Wrong organization')).not.toBeInTheDocument();
  expect(organization().getByRole('alert')).toBeVisible();
  expect(organization().queryByRole('link', { name: 'Роли и настройки' })).not.toBeInTheDocument();
  fireEvent.click(organization().getByRole('button', { name: 'Повторить загрузку' }));
  await act(async () => {
    finish({ data: team(7, 'New organization') });
  });
  expect(organization().getByText('New organization')).toBeVisible();
});

it('localizes organization labels and configured role names in English', async () => {
  persistLocale('en');
  render(page());
  await screen.findByText('Connected organization');
  expect(organization().getByText('Company')).toBeVisible();
  expect(organization().getByText('Organization owner')).toBeVisible();
  expect(organization().getByRole('link', { name: 'Open team' })).toBeVisible();
  expect(organization().getByRole('link', { name: 'Roles and settings' })).toBeVisible();
  expect(screen.queryByText(/Discuss organization setup/)).not.toBeInTheDocument();
});

it('uses the shared learner navigation without author-only links', async () => {
  auth.user.organization_role = 'member';
  render(page());
  await screen.findByText('Connected organization');
  const navigation = within(screen.getByRole('navigation', { name: 'Разделы платформы' }));
  expect(navigation.getByRole('link', { name: 'Моё обучение' })).toHaveAttribute(
    'href',
    '/learning',
  );
  expect(navigation.getByRole('link', { name: 'Прогресс' })).toHaveAttribute('href', '/dashboard');
  expect(navigation.queryByRole('link', { name: 'Создать курс' })).not.toBeInTheDocument();
  expect(navigation.queryByRole('link', { name: 'Курсы' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Мои курсы' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Помощь и контакты' })).toHaveAttribute(
    'href',
    '/legal/contacts/',
  );
});

it('shows server-granted author navigation without resetting an edited profile draft', async () => {
  auth.user.organization_role = 'member';
  let finish!: (result: {
    data: {
      can_author: boolean;
      can_review: boolean;
      can_report: boolean;
      can_manage_team: boolean;
    };
  }) => void;
  vi.mocked(api.get).mockImplementation(async (path) => {
    if (path === '/team/permissions')
      return new Promise((resolve) => {
        finish = resolve;
      });
    return path.startsWith('/team?') ? { data: team() } : otherRead(path);
  });
  render(page());
  const input = screen.getByRole('textbox', { name: 'Имя и фамилия' });
  fireEvent.change(input, { target: { value: 'Edited profile name' } });
  expect(screen.queryByRole('link', { name: 'Создать курс' })).not.toBeInTheDocument();
  await act(async () => {
    finish({
      data: {
        can_author: true,
        can_review: false,
        can_report: false,
        can_manage_team: false,
      },
    });
  });
  const navigation = within(screen.getByRole('navigation', { name: 'Разделы платформы' }));
  expect(navigation.getByRole('link', { name: 'Создать курс' })).toHaveAttribute(
    'href',
    '/express',
  );
  expect(navigation.getByRole('link', { name: 'Курсы' })).toHaveAttribute('href', '/courses');
  expect(input).toHaveValue('Edited profile name');
  expect(api.patch).not.toHaveBeenCalled();
});

it('keeps logout in the working shared account dropdown', async () => {
  render(page());
  await screen.findByText('Connected organization');
  const menu = screen.getByRole('banner');
  fireEvent.click(menu.querySelector('summary')!);
  fireEvent.click(within(menu).getByRole('button', { name: 'Выйти из аккаунта ↗' }));
  expect(auth.logout).toHaveBeenCalledOnce();
});
