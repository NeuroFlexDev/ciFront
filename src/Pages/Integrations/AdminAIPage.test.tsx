import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AIManagement } from './AdminAIPage';
import type { AIOverview } from './aiTypes';
import { api } from '@/shared/api';
import { ApiError } from '@/shared/errors';
import { LocaleProvider } from '@/i18n/LocaleContext';
import { aiControlEnglish } from '@/i18n/aiControl';
import { globalEnglish } from '@/i18n/global';

vi.mock('@/shared/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
const snapshot: AIOverview = {
  revision: 7,
  providers: [
    {
      id: 'vsellm',
      name: 'VSELLM',
      base_url: 'https://api.vsellm.ru/v1',
      local: false,
      enabled: true,
      has_key: true,
      available: true,
      managed: false,
      project: '',
      timeout_seconds: 60,
      credential_source: 'environment',
      last_check: null,
    },
  ],
  models: [
    {
      provider: 'vsellm',
      model: 'model-a',
      approved: true,
      roles: ['lesson_writer'],
      tier: 0,
      input_rub_per_million: '10',
      output_rub_per_million: '50',
      max_input_tokens: 30000,
      max_output_tokens: 8000,
      context_window: 32000,
      json_mode: true,
      independent_review: false,
      vision: false,
      extra_body: {},
    },
  ],
  roles: { lesson_writer: 'Написание уроков', critic_qa: 'Проверка качества' },
  catalog: [
    {
      id: 'deepseek',
      name: 'DeepSeek',
      base_url: 'https://api.deepseek.com',
      local: false,
      purpose: 'Прямой канал для сравнения стоимости генерации',
      docs: 'https://api-docs.deepseek.com/quick_start/pricing/',
    },
  ],
  policy: { mode: 'adaptive', local_only: false, min_samples: 10, min_pass_rate: 0.85 },
  stats: {},
  stats_truncated: false,
  local_endpoints: [],
  cache_ttl_seconds: 86400,
  reload_seconds: 5,
};
beforeEach(() => {
  localStorage.clear();
  vi.mocked(api.get).mockResolvedValue({ data: structuredClone(snapshot) });
  vi.mocked(api.put).mockResolvedValue({ data: { revision: 8 } });
  vi.mocked(api.post).mockResolvedValue({ data: { revision: 8 } });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
});
function show() {
  return render(
    <LocaleProvider dictionaries={{ en: { ...globalEnglish, ...aiControlEnglish } }}>
      <MemoryRouter>
        <AIManagement />
      </MemoryRouter>
    </LocaleProvider>,
  );
}

it('keeps saved keys write-only and sends a replacement only on explicit save', async () => {
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Настроить VSELLM' }));
  expect(screen.queryByLabelText('Новый API-ключ')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Действие с ключом'), { target: { value: 'replace' } });
  const key = screen.getByLabelText('Новый API-ключ');
  expect(key).toHaveAttribute('type', 'password');
  fireEvent.change(key, { target: { value: 'test-private-key' } });
  expect(api.put).not.toHaveBeenCalled();
  expect(JSON.stringify(localStorage)).not.toContain('test-private-key');
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить подключение' }));
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith(
      '/admin/ai/providers/vsellm',
      expect.objectContaining({
        expected_revision: 7,
        key_action: 'replace',
        api_key: 'test-private-key',
      }),
    ),
  );
  await waitFor(() => expect(screen.queryByLabelText('Новый API-ключ')).not.toBeInTheDocument());
});

it('keeps the original revision during a refresh and clears a rejected secret', async () => {
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Настроить VSELLM' }));
  fireEvent.change(screen.getByLabelText('Действие с ключом'), { target: { value: 'replace' } });
  fireEvent.change(screen.getByLabelText('Новый API-ключ'), {
    target: { value: 'test-private-key' },
  });
  vi.mocked(api.get).mockResolvedValue({ data: { ...snapshot, revision: 9 } });
  fireEvent.click(screen.getByRole('button', { name: 'Обновить' }));
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  vi.mocked(api.put).mockRejectedValue(
    new ApiError('Настройки изменены другим оператором', 409, 'http'),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить подключение' }));
  await screen.findByText('Настройки изменены другим оператором');
  expect(screen.getByLabelText('Новый API-ключ')).toHaveValue('');
  expect(api.put).toHaveBeenCalledWith(
    '/admin/ai/providers/vsellm',
    expect.objectContaining({ expected_revision: 7 }),
  );
  expect(api.put).toHaveBeenCalledTimes(1);
});

it('saves model revocation with prices, context and role assignments', async () => {
  show();
  fireEvent.click(
    within(await screen.findByRole('navigation', { name: 'Разделы AI' })).getByRole('button', {
      name: 'Модели',
    }),
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Настроить модель model-a vsellm' }));
  fireEvent.click(screen.getByLabelText('Допустить модель к генерации'));
  fireEvent.change(screen.getByLabelText('Ответ: ₽ за 1 млн токенов'), { target: { value: '45' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить модель' }));
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith(
      '/admin/ai/models',
      expect.objectContaining({
        expected_revision: 7,
        provider: 'vsellm',
        model: 'model-a',
        approved: false,
        output_rub_per_million: '45',
        context_window: 32000,
        roles: ['lesson_writer'],
      }),
    ),
  );
});

it('checks only a saved connection and submits no key or generation prompt', async () => {
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Проверить API' }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith('/admin/ai/providers/vsellm/check', {
      expected_revision: 7,
    }),
  );
  expect(api.put).not.toHaveBeenCalled();
});

it('provides English configuration and presets without enabling a new provider by default', async () => {
  localStorage.setItem('lernium_locale', 'en');
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Add connection' }));
  const section = await screen.findByRole('dialog');
  fireEvent.click(within(section).getByRole('button', { name: 'Connect' }));
  expect(screen.getByLabelText('API base URL')).toHaveValue('https://api.deepseek.com');
  expect(screen.getByLabelText('Enable provider for requests')).not.toBeChecked();
  expect(screen.getByLabelText('New API key')).toHaveValue('');
});

it('protects unsaved keys, traps focus and restores the triggering control after dismissal', async () => {
  show();
  const trigger = await screen.findByRole('button', { name: 'Настроить VSELLM' });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Подключение провайдера' });
  expect(dialog).toContainElement(document.activeElement as HTMLElement);
  fireEvent.change(screen.getByLabelText('Действие с ключом'), { target: { value: 'replace' } });
  fireEvent.change(screen.getByLabelText('Новый API-ключ'), {
    target: { value: 'unsaved-private-key' },
  });
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'Продолжить редактирование' })).toBeVisible();
  expect(screen.getByLabelText('Новый API-ключ')).toHaveValue('unsaved-private-key');
  fireEvent.click(screen.getByRole('button', { name: 'Закрыть без сохранения' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(api.put).not.toHaveBeenCalled();
  expect(JSON.stringify(localStorage)).not.toContain('unsaved-private-key');
});

it('imports current OpenRouter metadata only with an explicit exchange rate and leaves approval off', async () => {
  const data = structuredClone(snapshot);
  data.providers[0] = {
    ...data.providers[0],
    id: 'openrouter',
    name: 'OpenRouter',
    base_url: 'https://openrouter.ai/api/v1',
    last_check: {
      status: 'catalog_available',
      checked_at: '2026-10-22T12:00:00Z',
      models: ['qwen/example'],
      model_details: [
        {
          id: 'qwen/example',
          context_window: 1000000,
          max_output_tokens: 32000,
          input_usd_per_million: '0.15',
          output_usd_per_million: '0.47',
          json_mode: true,
          vision: true,
        },
      ],
    },
  };
  vi.mocked(api.get).mockResolvedValue({ data });
  show();
  fireEvent.click(
    within(await screen.findByRole('navigation', { name: 'Разделы AI' })).getByRole('button', {
      name: 'Модели',
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Добавить модель' }));
  fireEvent.change(screen.getByLabelText('ID модели'), { target: { value: 'qwen/example' } });
  expect(screen.getByRole('button', { name: 'Заполнить тарифы и лимиты' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Ваш курс оплаты, ₽ за $1'), { target: { value: '90' } });
  fireEvent.click(screen.getByRole('button', { name: 'Заполнить тарифы и лимиты' }));
  expect(screen.getByLabelText('Вход: ₽ за 1 млн токенов')).toHaveValue(13.5);
  expect(screen.getByLabelText('Ответ: ₽ за 1 млн токенов')).toHaveValue(42.3);
  expect(screen.getByLabelText('Общий контекст, токенов')).toHaveValue(1000000);
  expect(screen.getByLabelText('Поддерживает изображения')).toBeChecked();
  expect(screen.getByLabelText('Допустить модель к генерации')).not.toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить модель' }));
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith(
      '/admin/ai/models',
      expect.objectContaining({
        provider: 'openrouter',
        model: 'qwen/example',
        approved: false,
        input_rub_per_million: '13.5000',
        context_window: 1000000,
        expected_revision: 7,
      }),
    ),
  );
});

it('filters models and keeps other AI sections out of the current workflow', async () => {
  show();
  const nav = await screen.findByRole('navigation', { name: 'Разделы AI' });
  expect(
    screen.queryByRole('heading', { name: 'Модели и этапы генерации' }),
  ).not.toBeInTheDocument();
  fireEvent.click(within(nav).getByRole('button', { name: 'Модели' }));
  fireEvent.change(screen.getByRole('searchbox', { name: 'Поиск модели' }), {
    target: { value: 'absent' },
  });
  expect(screen.getByRole('heading', { name: 'Модели не найдены' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
  expect(screen.getByRole('button', { name: 'Настроить модель model-a vsellm' })).toBeVisible();
  fireEvent.click(within(nav).getByRole('button', { name: 'Расходы' }));
  expect(
    screen.queryByRole('button', { name: 'Настроить модель model-a vsellm' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Вызовов за этот период пока нет.' })).toBeVisible();
});

it('shows a rejected connection check as an error instead of a success notification', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { revision: 8, status: 'access_denied' } });
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Проверить API' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Нет доступа: проверьте ключ и права'),
  );
  expect(screen.queryByText('VSELLM: Каталог API доступен')).not.toBeInTheDocument();
});
