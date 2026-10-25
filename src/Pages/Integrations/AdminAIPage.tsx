import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Plug,
  Layers3,
  Route,
  ChartNoAxesCombined,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import AdminInlinePanel from '@/Components/Admin/AdminInlinePanel';
import AdminDialog from '@/Components/Admin/AdminDialog';
import AdminToast from '@/Components/Admin/AdminToast';
import { useLocale } from '@/i18n/useLocale';
import { useAuth } from '@/auth/useAuth';
import { api } from '@/shared/api';
import { RequestError } from '@/Components/RequestState';
import { Shell } from '@/Pages/Workspace/WorkspaceComponents';
import { dateText } from '@/Pages/Workspace/shared';
import { Empty, Field, ResourceState } from './IntegrationComponents';
import { useResource } from './useResource';
import type { AIOverview, AIProvider, AIModel, AIPreset } from './aiTypes';
import s from './integrations.module.css';
import a from './ai.module.css';

type EditorProps = { data: AIOverview; done: () => void; cancel: () => void };
function Check({
  label,
  value,
  change,
}: {
  label: string;
  value: boolean;
  change: (value: boolean) => void;
}) {
  return (
    <label className={s.check}>
      <input type='checkbox' checked={value} onChange={(e) => change(e.target.checked)} />
      {label}
    </label>
  );
}
function NumberField({
  label,
  value,
  change,
  min = 0,
  max,
  step = '1',
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <label>
      {label}
      <input
        type='number'
        required
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => change(e.target.value)}
      />
    </label>
  );
}
function ProviderEditor({
  data,
  initial,
  done,
  cancel,
  inline = false,
}: EditorProps & { initial: AIProvider | AIPreset | null; inline?: boolean }) {
  const { t } = useLocale();
  const existing = initial && 'has_key' in initial;
  const Frame = inline ? AdminInlinePanel : AdminDialog;
  const [id, setId] = useState(initial?.id || '');
  const [name, setName] = useState(initial?.name || '');
  const [endpoint, setEndpoint] = useState(initial?.base_url || '');
  const [local, setLocal] = useState(initial?.local || false);
  const [enabled, setEnabled] = useState(existing ? initial.enabled : false);
  const [project, setProject] = useState(existing ? initial.project : '');
  const [timeout, setTimeout] = useState(String(existing ? initial.timeout_seconds : 60));
  const [keyAction, setKeyAction] = useState(existing ? 'keep' : 'replace');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.put(`/admin/ai/providers/${encodeURIComponent(id)}`, {
        expected_revision: data.revision,
        name,
        base_url: endpoint,
        local,
        enabled,
        project,
        timeout_seconds: Number(timeout),
        key_action: keyAction,
        ...(keyAction === 'replace' ? { api_key: key } : {}),
      });
      setKey('');
      done();
    } catch (reason) {
      setKey('');
      setError(reason);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Frame
      title={initial?.name || t('Подключение провайдера')}
      onClose={cancel}
      busy={busy}
      guard
      className={`${s.content} ${a.page}`}
    >
      <section className={a.editor}>
        <p>
          {t(
            'Ключ шифруется на сервере и не показывается повторно. Пустое поле не заменяет сохранённый ключ.',
          )}
        </p>
        {!!error && <RequestError error={error} />}
        <form className={s.form} onSubmit={submit}>
          <fieldset className={s.form} disabled={busy}>
            <div className={s.fields}>
              <label>
                {t('ID подключения')}
                <input
                  value={id}
                  disabled={!!existing}
                  required
                  pattern='[a-z][a-z0-9_-]{0,39}'
                  maxLength={40}
                  onChange={(e) => setId(e.target.value)}
                />
              </label>
              <Field
                label={t('Название подключения')}
                value={name}
                onChange={setName}
                maxLength={100}
              />
              <Field
                label={t('Адрес API')}
                value={endpoint}
                onChange={setEndpoint}
                type='url'
                maxLength={1000}
              />
              {(endpoint.includes('yandex') || project) && (
                <Field
                  label={t('Каталог / проект (для Yandex)')}
                  value={project}
                  onChange={setProject}
                  required={false}
                  maxLength={128}
                />
              )}
              <NumberField
                label={t('Тайм-аут, секунд')}
                value={timeout}
                change={setTimeout}
                min={1}
                max={300}
              />
              <label>
                {t('Действие с ключом')}
                <select
                  value={keyAction}
                  onChange={(e) => {
                    setKeyAction(e.target.value);
                    setKey('');
                  }}
                >
                  <option value='keep'>{t('Оставить текущий')}</option>
                  <option value='replace'>{t('Сохранить новый ключ')}</option>
                  <option value='remove'>{t('Удалить ключ')}</option>
                </select>
              </label>
            </div>
            {keyAction === 'replace' && (
              <Field
                label={t('Новый API-ключ')}
                type='password'
                value={key}
                onChange={setKey}
                maxLength={8192}
              />
            )}
            {keyAction === 'remove' && (
              <p className={s.notice}>
                {t(
                  'Перед удалением ключа отключите внешний провайдер. Сохранённые модели останутся.',
                )}
              </p>
            )}
            <div className={s.checks}>
              <Check
                label={t('Локальный сервер моделей')}
                value={local}
                change={(value) => {
                  setLocal(value);
                  if (value && !existing) setKeyAction('keep');
                }}
              />
              <Check
                label={t('Включить провайдер для запросов')}
                value={enabled}
                change={setEnabled}
              />
            </div>
            {local && (
              <p className={s.notice}>
                {t(
                  'Локальный адрес должен быть разрешён на сервере в AI_LOCAL_ENDPOINTS. Модель запускается отдельно.',
                )}{' '}
                {data.local_endpoints.join(', ') || t('Разрешённых адресов пока нет.')}
              </p>
            )}
            <div className={s.row}>
              <button>{busy ? t('Сохраняем…') : t('Сохранить подключение')}</button>
              <button type='button' data-dialog-close className={s.secondary} onClick={cancel}>
                {t('Отмена')}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    </Frame>
  );
}

function ModelEditor({ data, initial, done, cancel }: EditorProps & { initial: AIModel | null }) {
  const { t } = useLocale();
  const [provider, setProvider] = useState(initial?.provider || data.providers[0]?.id || '');
  const [model, setModel] = useState(initial?.model || '');
  const [roles, setRoles] = useState(initial?.roles || ['lesson_writer']);
  const [approved, setApproved] = useState(initial?.approved || false);
  const [inputPrice, setInputPrice] = useState(initial?.input_rub_per_million || '');
  const [outputPrice, setOutputPrice] = useState(initial?.output_rub_per_million || '');
  const [context, setContext] = useState(initial ? String(initial.context_window) : '');
  const [input, setInput] = useState(initial ? String(initial.max_input_tokens) : '');
  const [output, setOutput] = useState(initial ? String(initial.max_output_tokens) : '');
  const [tier, setTier] = useState(String(initial?.tier || 0));
  const [jsonMode, setJsonMode] = useState(initial?.json_mode ?? true);
  const [vision, setVision] = useState(initial?.vision || false);
  const [independent, setIndependent] = useState(initial?.independent_review || false);
  const [extra, setExtra] = useState(JSON.stringify(initial?.extra_body || {}, null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [exchange, setExchange] = useState('');
  const connection = data.providers.find((item) => item.id === provider);
  const catalog = connection?.last_check?.models || [];
  const catalogModel = connection?.last_check?.model_details?.find((item) => item.id === model);
  function fillCatalog() {
    if (!catalogModel || !Number.isFinite(Number(exchange)) || Number(exchange) <= 0) return;
    setContext(String(catalogModel.context_window));
    setInput(String(catalogModel.context_window));
    setOutput(String(catalogModel.max_output_tokens));
    setInputPrice((Number(catalogModel.input_usd_per_million) * Number(exchange)).toFixed(4));
    setOutputPrice((Number(catalogModel.output_usd_per_million) * Number(exchange)).toFixed(4));
    setJsonMode(catalogModel.json_mode);
    setVision(catalogModel.vision);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let extraBody: unknown;
      try {
        extraBody = JSON.parse(extra);
      } catch {
        throw new Error(t('Параметры модели должны быть корректным JSON.'));
      }
      if (!extraBody || typeof extraBody !== 'object' || Array.isArray(extraBody))
        throw new Error(t('Параметры модели должны быть объектом JSON.'));
      await api.put('/admin/ai/models', {
        expected_revision: data.revision,
        provider,
        model,
        roles,
        approved,
        input_rub_per_million: inputPrice,
        output_rub_per_million: outputPrice,
        context_window: Number(context),
        max_input_tokens: Number(input),
        max_output_tokens: Number(output),
        tier: Number(tier),
        json_mode: jsonMode,
        independent_review: independent,
        vision,
        extra_body: extraBody,
      });
      done();
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminDialog
      title={t('Настройка модели')}
      onClose={cancel}
      busy={busy}
      guard
      className={`${s.content} ${a.page}`}
    >
      <section className={a.editor}>
        <p>
          {t(
            'Укажите ID, физические лимиты и актуальные тарифы из документации провайдера. Для цены в валюте пересчитайте оба тарифа в рубли по своему курсу оплаты.',
          )}
        </p>
        {!!error && <RequestError error={error} />}
        <form className={s.form} onSubmit={submit}>
          <fieldset className={s.form} disabled={busy}>
            <div className={s.fields}>
              <label>
                {t('Провайдер')}
                <select
                  required
                  value={provider}
                  disabled={!!initial}
                  onChange={(e) => {
                    setProvider(e.target.value);
                    setModel('');
                  }}
                >
                  {data.providers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('ID модели')}
                <input
                  required
                  list='ai-model-catalog'
                  value={model}
                  disabled={!!initial}
                  maxLength={255}
                  onChange={(e) => setModel(e.target.value)}
                />
                <datalist id='ai-model-catalog'>
                  {catalog.map((id) => (
                    <option key={id} value={id} />
                  ))}
                </datalist>
              </label>
            </div>
            {catalogModel && (
              <div className={a.catalogFill}>
                <div>
                  <strong>{t('Данные из OpenRouter')}</strong>
                  <p>
                    {catalogModel.input_usd_per_million} / {catalogModel.output_usd_per_million}{' '}
                    {t('USD за 1 млн: вход / ответ')} ·{' '}
                    {dateText(connection!.last_check!.checked_at)}
                  </p>
                </div>
                <label>
                  {t('Ваш курс оплаты, ₽ за $1')}
                  <input
                    type='number'
                    min='0.01'
                    step='any'
                    value={exchange}
                    onChange={(e) => setExchange(e.target.value)}
                    placeholder='90'
                  />
                </label>
                <button
                  type='button'
                  className={s.secondary}
                  disabled={!Number.isFinite(Number(exchange)) || Number(exchange) <= 0}
                  onClick={fillCatalog}
                >
                  {t('Заполнить тарифы и лимиты')}
                </button>
                <small>
                  {t('Учитывайте комиссии в курсе оплаты. Допуск и этапы выбираются отдельно.')}
                </small>
              </div>
            )}
            <h3>{t('Стоимость и возможности')}</h3>
            <div className={s.fields}>
              <NumberField
                label={t('Вход: ₽ за 1 млн токенов')}
                value={inputPrice}
                change={setInputPrice}
                step='any'
              />
              <NumberField
                label={t('Ответ: ₽ за 1 млн токенов')}
                value={outputPrice}
                change={setOutputPrice}
                step='any'
              />
              <NumberField
                label={t('Общий контекст, токенов')}
                value={context}
                change={setContext}
                min={1}
              />
              <NumberField
                label={t('Максимум входа, токенов')}
                value={input}
                change={setInput}
                min={1}
              />
              <NumberField
                label={t('Максимум ответа, токенов')}
                value={output}
                change={setOutput}
                min={1}
              />
              <NumberField
                label={t('Уровень эскалации (0–10)')}
                value={tier}
                change={setTier}
                max={10}
              />
            </div>
            <p>
              {t(
                'Уровень 0 — обычные задачи; более высокий уровень доступен при усложнении и повторной проверке. Среди подходящих моделей выбор зависит от цены и качества.',
              )}
            </p>
            <h3>{t('Этапы работы')}</h3>
            <div className={s.checks}>
              {Object.entries(data.roles).map(([id, label]) => (
                <Check
                  key={id}
                  label={t(label)}
                  value={roles.includes(id)}
                  change={(checked) =>
                    setRoles((previous) =>
                      checked ? [...previous, id] : previous.filter((role) => role !== id),
                    )
                  }
                />
              ))}
            </div>
            <div className={s.checks}>
              <Check label={t('Поддерживает JSON-ответ')} value={jsonMode} change={setJsonMode} />
              <Check label={t('Поддерживает изображения')} value={vision} change={setVision} />
              <Check
                label={t('Допущена к независимой проверке')}
                value={independent}
                change={setIndependent}
              />
              <Check
                label={t('Допустить модель к генерации')}
                value={approved}
                change={setApproved}
              />
            </div>
            <details>
              <summary>{t('Дополнительные параметры модели')}</summary>
              <p>
                {t(
                  'Параметры provider, thinking, reasoning, google или chat_template_kwargs. Например, для OpenRouter: {"provider":{"data_collection":"deny","zdr":true}}. Поддержка зависит от провайдера.',
                )}
              </p>
              <label>
                {t('Параметры JSON')}
                <textarea
                  value={extra}
                  rows={5}
                  maxLength={4096}
                  spellCheck={false}
                  onChange={(e) => setExtra(e.target.value)}
                />
              </label>
            </details>
            <div className={s.row}>
              <button disabled={!roles.length}>
                {busy ? t('Сохраняем…') : t('Сохранить модель')}
              </button>
              <button type='button' data-dialog-close className={s.secondary} onClick={cancel}>
                {t('Отмена')}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    </AdminDialog>
  );
}

function PolicyEditor({ data, done, cancel }: EditorProps) {
  const { t } = useLocale();
  const [localOnly, setLocalOnly] = useState(data.policy.local_only);
  const [samples, setSamples] = useState(String(data.policy.min_samples));
  const [quality, setQuality] = useState(String(Math.round(data.policy.min_pass_rate * 100)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.put('/admin/ai/policy', {
        expected_revision: data.revision,
        mode: 'adaptive',
        local_only: localOnly,
        min_samples: Number(samples),
        min_pass_rate: Number(quality) / 100,
      });
      done();
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminDialog
      title={t('Правила маршрутизации')}
      onClose={cancel}
      busy={busy}
      guard
      className={`${s.content} ${a.page}`}
    >
      <section className={a.editor}>
        {!!error && <RequestError error={error} />}
        <form className={s.form} onSubmit={submit}>
          <fieldset disabled={busy} className={s.form}>
            <p>
              {t(
                'Умный выбор выполняется перед каждым запросом. Ошибки провайдера временно исключают его из маршрутов; низкое качество исключает модель после накопления статистики.',
              )}
            </p>
            <div className={s.fields}>
              <NumberField
                label={t('Минимум проверок качества')}
                value={samples}
                change={setSamples}
                min={3}
                max={1000}
              />
              <NumberField
                label={t('Минимальная доля успешных проверок, %')}
                value={quality}
                change={setQuality}
                min={50}
                max={100}
              />
            </div>
            <Check
              label={t('Только локальные модели: запретить внешние AI-запросы и веб-поиск')}
              value={localOnly}
              change={setLocalOnly}
            />
            {localOnly && (
              <p className={s.notice}>
                {t(
                  'Без доступной локальной модели полноценная генерация остановится с сохранением прогресса. Помощник продолжит давать ограниченные ответы по доступным материалам.',
                )}
              </p>
            )}
            <div className={s.row}>
              <button>{busy ? t('Сохраняем…') : t('Применить правила')}</button>
              <button type='button' data-dialog-close className={s.secondary} onClick={cancel}>
                {t('Отмена')}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    </AdminDialog>
  );
}

const checkLabels: Record<string, string> = {
  catalog_available: 'Каталог API доступен',
  access_denied: 'Нет доступа: проверьте ключ и права',
  catalog_unsupported: 'API каталога не поддерживается',
  rate_limited: 'Лимит запросов провайдера',
  unavailable: 'Нет связи с API',
};
type Editor =
  | { kind: 'provider'; initial: AIProvider | AIPreset | null; data: AIOverview }
  | { kind: 'model'; initial: AIModel | null; data: AIOverview }
  | { kind: 'policy'; data: AIOverview };
const sections = [
  ['connections', 'Подключения', Plug],
  ['models', 'Модели', Layers3],
  ['routing', 'Маршрутизация', Route],
  ['usage', 'Расходы', ChartNoAxesCombined],
] as const;
export function AIManagement() {
  const { t, locale } = useLocale();
  const resource = useResource<AIOverview>('/admin/ai');
  const [params, setParams] = useSearchParams();
  const section = sections.some(([id]) => id === params.get('section'))
    ? params.get('section')!
    : 'connections';
  const [editor, setEditor] = useState<Editor | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const data = resource.data;
  const blocked = !!editor || !!busy || resource.loading;
  const number = (value: number) => value.toLocaleString(locale === 'en' ? 'en-GB' : 'ru-RU');
  function navigate(id: string) {
    setParams({ section: id });
    setQuery('');
  }
  function done() {
    setEditor(null);
    setMessage(t('Сохранено. Новые запросы подхватят настройки в течение 5 секунд.'));
    resource.reload();
  }
  function edit(value: Editor) {
    setCatalogOpen(false);
    setEditor(value);
    setMessage('');
    setError(null);
  }
  async function check(provider: AIProvider) {
    if (!data || busy) return;
    setBusy(provider.id);
    setError(null);
    setMessage('');
    try {
      const result = await api.post<{ status: string }>(
        `/admin/ai/providers/${encodeURIComponent(provider.id)}/check`,
        { expected_revision: data.revision },
      );
      if (result.data.status && result.data.status !== 'catalog_available') {
        setError(
          new Error(`${provider.name}: ${t(checkLabels[result.data.status] || 'Нет связи с API')}`),
        );
      } else setMessage(`${provider.name}: ${t('Каталог API доступен')}`);
      resource.reload();
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy('');
    }
  }
  const models =
    data?.models.filter(
      (model) =>
        (!providerFilter || model.provider === providerFilter) &&
        (!roleFilter || model.roles.includes(roleFilter)) &&
        `${model.model} ${model.provider}`.toLowerCase().includes(query.toLowerCase()),
    ) || [];
  return (
    <div className={`${s.content} ${a.page}`}>
      <ResourceState {...resource} />
      {!!error && <RequestError error={error} />}
      <AdminToast message={message} onClose={() => setMessage('')} />
      {data && (
        <>
          <details className={a.summaryDisclosure}>
            <summary>{t('Сводка подключений и моделей')}</summary>
            <div className={a.summary}>
              <div>
                <Plug size={20} />
                <span>{t('Доступные подключения')}</span>
                <strong>
                  {data.providers.filter((p) => p.available).length}
                  <small> / {data.providers.length}</small>
                </strong>
              </div>
              <div>
                <Layers3 size={20} />
                <span>{t('Моделей допущено')}</span>
                <strong>{data.models.filter((m) => m.approved).length}</strong>
              </div>
              <div>
                <ShieldCheck size={20} />
                <span>{t('Режим работы')}</span>
                <strong className={a.textMetric}>
                  {t(data.policy.local_only ? 'Свой контур' : 'Умный выбор')}
                </strong>
              </div>
            </div>
          </details>
          <div className={a.workspaceBar}>
            <nav className={a.tabs} aria-label={t('Разделы AI')}>
              {sections.map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={s.secondary}
                  aria-current={section === id ? 'page' : undefined}
                  disabled={!!editor}
                  onClick={() => navigate(id)}
                >
                  <Icon size={17} />
                  {t(label)}
                </button>
              ))}
            </nav>
            <button
              className={s.secondary}
              disabled={!!busy || resource.loading}
              onClick={resource.reload}
              aria-label={t('Обновить')}
            >
              <RefreshCw size={17} />
            </button>
          </div>
          {section === 'connections' && (
            <section className={a.section}>
              <div className={a.sectionHeading}>
                <div>
                  <h2>{t('Ваши подключения')}</h2>
                  <p>{t('Подключите сервис, проверьте API и назначьте модели на этапы.')}</p>
                </div>
                <button disabled={blocked} onClick={() => setCatalogOpen(true)}>
                  <Plus size={17} />
                  {t('Добавить подключение')}
                </button>
              </div>
              <div
                className={a.providerWorkspace}
                data-editing={
                  editor?.kind === 'provider' && !!editor.initial && 'has_key' in editor.initial
                }
              >
                <div className={a.cards}>
                  {data.providers.map((provider) => {
                    const assigned = data.models.filter(
                      (m) => m.provider === provider.id && m.approved,
                    ).length;
                    return (
                      <article className={a.card} key={provider.id}>
                        <header>
                          <div className={a.providerTitle}>
                            <span className={a.providerIcon}>
                              {provider.name.slice(0, 1).toUpperCase()}
                            </span>
                            <div>
                              <h3>{provider.name}</h3>
                              <span className={a.endpoint}>{provider.base_url}</span>
                            </div>
                          </div>
                          <span className={a.badge} data-good={provider.available && assigned > 0}>
                            {t(
                              !provider.enabled
                                ? 'Отключён'
                                : !provider.has_key
                                  ? 'Нужен ключ'
                                  : provider.available
                                    ? assigned
                                      ? 'В маршрутизации'
                                      : 'Нет включённых моделей'
                                    : 'Временно исключён',
                            )}
                          </span>
                        </header>
                        <div className={a.providerInfo}>
                          <span>
                            <ShieldCheck size={16} />
                            {t(
                              provider.has_key
                                ? 'Ключ сохранён'
                                : provider.local
                                  ? 'Локальный API без ключа'
                                  : 'Ключ не задан',
                            )}
                          </span>
                          <span>
                            {t('Моделей допущено')}: <b>{assigned}</b>
                          </span>
                        </div>
                        <div className={a.checkResult}>
                          {provider.last_check ? (
                            <>
                              <span data-good={provider.last_check.status === 'catalog_available'}>
                                {t(checkLabels[provider.last_check.status] || 'Нет связи с API')}
                              </span>
                              <small>
                                {dateText(provider.last_check.checked_at)} ·{' '}
                                {provider.last_check.models.length} {t('моделей в каталоге')}
                              </small>
                            </>
                          ) : (
                            <span>{t('Проверка подключения ещё не запускалась')}</span>
                          )}
                        </div>
                        <footer>
                          <button
                            className={s.secondary}
                            disabled={blocked || !provider.has_key}
                            onClick={() => void check(provider)}
                          >
                            <RefreshCw size={15} />
                            {busy === provider.id ? t('Проверяем…') : t('Проверить API')}
                          </button>
                          <button
                            className={s.secondary}
                            disabled={blocked}
                            aria-label={`${t('Настроить')} ${provider.name}`}
                            onClick={() => edit({ kind: 'provider', initial: provider, data })}
                          >
                            <SlidersHorizontal size={15} />
                            {t('Настроить')}
                          </button>
                          <button
                            className={a.textButton}
                            disabled={!!editor}
                            onClick={() => {
                              setProviderFilter(provider.id);
                              navigate('models');
                            }}
                          >
                            {t('Модели')}
                            <ArrowUpRight size={16} />
                          </button>
                        </footer>
                      </article>
                    );
                  })}
                </div>
                {editor?.kind === 'provider' && !!editor.initial && 'has_key' in editor.initial && (
                  <ProviderEditor
                    key={editor.initial.id}
                    {...editor}
                    inline
                    done={done}
                    cancel={() => setEditor(null)}
                  />
                )}
              </div>
              <p className={a.footnote}>
                {t(
                  'Проверка API читает каталог без генерации. Баланс и качество ответов проверяются отдельно.',
                )}
              </p>
            </section>
          )}
          {section === 'models' && (
            <section className={a.section}>
              <div className={a.sectionHeading}>
                <div>
                  <h2>{t('Модели и этапы генерации')}</h2>
                  <p>{t('Выберите модель, задайте этапы и разрешите её использование.')}</p>
                </div>
                <button
                  disabled={blocked}
                  onClick={() => edit({ kind: 'model', initial: null, data })}
                >
                  <Plus size={17} />
                  {t('Добавить модель')}
                </button>
              </div>
              <div className={a.filters}>
                <label className={a.search}>
                  <Search size={18} />
                  <input
                    type='search'
                    aria-label={t('Поиск модели')}
                    placeholder={t('Найти модель…')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <select
                  aria-label={t('Фильтр по провайдеру')}
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                >
                  <option value=''>{t('Все провайдеры')}</option>
                  {data.providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t('Фильтр по этапу')}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value=''>{t('Все этапы')}</option>
                  {Object.entries(data.roles).map(([id, label]) => (
                    <option key={id} value={id}>
                      {t(label)}
                    </option>
                  ))}
                </select>
              </div>
              <p className={a.count}>
                {t('Найдено моделей')}: {models.length}
              </p>
              <div className={a.modelList}>
                {models.map((model) => (
                  <article className={a.modelRow} key={`${model.provider}::${model.model}`}>
                    <div className={a.modelMain}>
                      <div className={a.modelHeading}>
                        <h3>{model.model}</h3>
                        <span className={a.badge} data-good={model.approved}>
                          {t(model.approved ? 'Допущена' : 'Не допущена')}
                        </span>
                      </div>
                      <small>
                        {data.providers.find((p) => p.id === model.provider)?.name ||
                          model.provider}{' '}
                        · {t('Контекст')}: {number(model.context_window)}
                      </small>
                      <div className={a.roleChips}>
                        {model.roles.map((role) => (
                          <span key={role}>{t(data.roles[role] || role)}</span>
                        ))}
                      </div>
                    </div>
                    <div className={a.price}>
                      <strong>
                        {number(Number(model.input_rub_per_million))} /{' '}
                        {number(Number(model.output_rub_per_million))} ₽
                      </strong>
                      <small>{t('за 1 млн: вход / ответ')}</small>
                    </div>
                    <button
                      className={s.secondary}
                      disabled={blocked}
                      aria-label={`${t('Настроить модель')} ${model.model} ${model.provider}`}
                      onClick={() => edit({ kind: 'model', initial: model, data })}
                    >
                      <SlidersHorizontal size={16} />
                      {t('Настроить')}
                    </button>
                  </article>
                ))}
              </div>
              {!models.length && (
                <Empty>
                  <h3>{t('Модели не найдены')}</h3>
                  <p>{t('Измените фильтры или добавьте модель подключённого провайдера.')}</p>
                  <button
                    className={s.secondary}
                    onClick={() => {
                      setQuery('');
                      setProviderFilter('');
                      setRoleFilter('');
                    }}
                  >
                    {t('Сбросить фильтры')}
                  </button>
                </Empty>
              )}
            </section>
          )}
          {section === 'routing' && (
            <section className={a.section}>
              <div className={a.sectionHeading}>
                <div>
                  <h2>{t('Маршрутизация')}</h2>
                  <p>
                    {t('Стоимость, доступность и качество сравниваются перед каждым запросом.')}
                  </p>
                </div>
                <button disabled={blocked} onClick={() => edit({ kind: 'policy', data })}>
                  <SlidersHorizontal size={17} />
                  {t('Правила маршрутизации')}
                </button>
              </div>
              <div className={a.routingSummary}>
                <div>
                  <span>{t('Порог качества')}</span>
                  <strong>{Math.round(data.policy.min_pass_rate * 100)}%</strong>
                  <small>
                    {t('после проверок')}: {data.policy.min_samples}
                  </small>
                </div>
                <div>
                  <span>{t('Кеш ответов')}</span>
                  <strong>
                    {Math.round(data.cache_ttl_seconds / 3600)} {t('ч')}
                  </strong>
                  <small>{t('Разделён по пользователям и курсам')}</small>
                </div>
              </div>
              <h3>{t('Покрытие этапов')}</h3>
              <div className={a.coverage}>
                {Object.entries(data.roles).map(([role, label]) => {
                  const routes = data.models.filter(
                    (m) =>
                      m.approved &&
                      m.roles.includes(role) &&
                      data.providers.some((p) => p.id === m.provider && p.available),
                  );
                  return (
                    <div key={role}>
                      <CheckCircle2 size={17} data-good={routes.length > 0} />
                      <span>{t(label)}</span>
                      <button
                        className={a.textButton}
                        onClick={() => {
                          setRoleFilter(role);
                          setProviderFilter('');
                          navigate('models');
                        }}
                      >
                        {routes.length} {t('маршрутов')}
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <details className={a.help}>
                <summary>{t('Резерв и данные')}</summary>
                <p>
                  {t(
                    'При сбоях используются другие разрешённые маршруты. Если моделей нет, помощник даёт ограниченный локальный ответ, а генерация сохраняет прогресс. Для закрытого контура подключите собственную модель и включите локальный режим.',
                  )}
                </p>
                <p>
                  {t(
                    'Память и кеш остаются разделёнными по доступам. Смена моделей, адресов и правил меняет политику кеша; ротация ключа не удаляет материалы и завершённые этапы.',
                  )}
                </p>
              </details>
            </section>
          )}
          {section === 'usage' && (
            <section className={a.section}>
              <div className={a.sectionHeading}>
                <div>
                  <h2>{t('Использование при генерации курсов')}</h2>
                  <p>{t('Запуски, начатые за последние 24 часа')}</p>
                </div>
                <span className={a.badge}>{t('Расчётная стоимость')}</span>
              </div>
              {Object.keys(data.stats).length ? (
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>{t('Провайдер')}</th>
                        <th>{t('Вызовы / ошибки')}</th>
                        <th>{t('Токены: вход / ответ / кеш')}</th>
                        <th>{t('Расчётная стоимость, ₽')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.stats).map(([id, value]) => (
                        <tr key={id}>
                          <td>{id === 'unknown' ? t('Без данных о маршруте') : id}</td>
                          <td>
                            {value.calls} / {value.errors}
                          </td>
                          <td>
                            {number(value.input_tokens)} / {number(value.output_tokens)} /{' '}
                            {number(value.cached_tokens)}
                          </td>
                          <td>
                            {value.estimated_rub === null
                              ? t('Нет данных')
                              : Number(value.estimated_rub).toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty>
                  <ChartNoAxesCombined size={30} />
                  <h3>{t('Вызовов за этот период пока нет.')}</h3>
                  <p>{t('После генерации здесь появятся токены, ошибки и расчётные расходы.')}</p>
                </Empty>
              )}
              <p className={a.footnote}>
                {t(
                  'До 5 000 последних вызовов в запусках, начатых за 24 часа. Стоимость рассчитана по заданным тарифам без скидок кеша; это не счёт провайдера. Чаты, изображения и эмбеддинги в эту таблицу не входят.',
                )}
              </p>
              {data.stats_truncated && (
                <p>{t('Показана ограниченная выборка: последние 5 000 вызовов.')}</p>
              )}
            </section>
          )}
          {catalogOpen && (
            <AdminDialog
              title={t('Добавить подключение')}
              description={t('Выберите сервис. Адрес API заполнится автоматически.')}
              onClose={() => setCatalogOpen(false)}
              className={`${s.content} ${a.page}`}
            >
              <h3>{t('Рекомендуемые провайдеры')}</h3>
              <div className={a.presetList}>
                {data.catalog.map((preset) => (
                  <article key={preset.id}>
                    <div>
                      <h3>{preset.name}</h3>
                      <p>{t(preset.purpose)}</p>
                    </div>
                    <button
                      className={s.secondary}
                      disabled={data.providers.some((p) => p.id === preset.id)}
                      onClick={() => edit({ kind: 'provider', initial: preset, data })}
                    >
                      {t(
                        data.providers.some((p) => p.id === preset.id)
                          ? 'Уже добавлен'
                          : 'Подключить',
                      )}
                    </button>
                  </article>
                ))}
              </div>
              <button
                className={a.textButton}
                onClick={() => edit({ kind: 'provider', initial: null, data })}
              >
                {t('Другой совместимый сервис')}
                <Plus size={16} />
              </button>
            </AdminDialog>
          )}
          {editor?.kind === 'provider' && (!editor.initial || !('has_key' in editor.initial)) && (
            <ProviderEditor {...editor} done={done} cancel={() => setEditor(null)} />
          )}
          {editor?.kind === 'model' && (
            <ModelEditor {...editor} done={done} cancel={() => setEditor(null)} />
          )}
          {editor?.kind === 'policy' && (
            <PolicyEditor {...editor} done={done} cancel={() => setEditor(null)} />
          )}
        </>
      )}
    </div>
  );
}
export default function AdminAIPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  return (
    <Shell
      title={t('Мониторинг')}
      description={t('Подключения, модели, расходы и правила выбора для каждого этапа.')}
    >
      {user?.is_admin ? <AIManagement /> : <Empty>{t('Доступ только оператору')}</Empty>}
    </Shell>
  );
}
