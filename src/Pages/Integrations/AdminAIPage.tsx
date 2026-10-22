import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
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
}: EditorProps & { initial: AIProvider | AIPreset | null }) {
  const { t } = useLocale();
  const existing = initial && 'has_key' in initial;
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
    <section className={`${s.panel} ${a.editor}`} aria-label={t('Подключение провайдера')}>
      <h2>{t('Подключение провайдера')}</h2>
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
            <Field
              label={t('Каталог / проект (для Yandex)')}
              value={project}
              onChange={setProject}
              required={false}
              maxLength={128}
            />
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
            <button type='button' className={s.secondary} onClick={cancel}>
              {t('Отмена')}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
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
  const catalog = data.providers.find((item) => item.id === provider)?.last_check?.models || [];
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
    <section className={`${s.panel} ${a.editor}`} aria-label={t('Настройка модели')}>
      <h2>{t('Настройка модели')}</h2>
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
            <button type='button' className={s.secondary} onClick={cancel}>
              {t('Отмена')}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
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
    <section className={`${s.panel} ${a.editor}`} aria-label={t('Правила маршрутизации')}>
      <h2>{t('Правила маршрутизации')}</h2>
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
            <button type='button' className={s.secondary} onClick={cancel}>
              {t('Отмена')}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
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
export function AIManagement() {
  const { t } = useLocale();
  const resource = useResource<AIOverview>('/admin/ai');
  const [editor, setEditor] = useState<Editor | null>(null);
  const editorHost = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editor) {
      editorHost.current?.scrollIntoView?.({ block: 'start' });
      editorHost.current?.focus({ preventScroll: true });
    }
  }, [editor]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const data = resource.data;
  const blocked = !!editor || !!busy || resource.loading;
  function done() {
    setEditor(null);
    setMessage(t('Сохранено. Новые запросы подхватят настройки в течение 5 секунд.'));
    resource.reload();
  }
  function edit(value: Editor) {
    setEditor(value);
    setMessage('');
    setError(null);
  }
  async function check(provider: AIProvider) {
    if (!data) return;
    setBusy(provider.id);
    setError(null);
    setMessage('');
    try {
      await api.post(`/admin/ai/providers/${encodeURIComponent(provider.id)}/check`, {
        expected_revision: data.revision,
      });
      setMessage(t('Проверка завершена. Результат указан в карточке подключения.'));
      resource.reload();
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy('');
    }
  }
  return (
    <div className={`${s.content} ${s.view} ${a.page}`}>
      <ResourceState {...resource} />
      {!!error && <RequestError error={error} />}
      {message && (
        <p className={s.success} role='status'>
          {message}
        </p>
      )}
      {data && (
        <>
          <div className={a.summary}>
            <div>
              <span>{t('Подключения')}</span>
              <strong>
                {data.providers.filter((item) => item.available).length} / {data.providers.length}
              </strong>
              <small>{t('Доступны для маршрутизации')}</small>
            </div>
            <div>
              <span>{t('Маршрутизация')}</span>
              <strong>{t(data.policy.mode === 'adaptive' ? 'Умная' : 'Настройте правила')}</strong>
              <small>
                {t(data.policy.local_only ? 'Только свой контур' : 'Облачные и локальные модели')}
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
          <div className={s.row}>
            <button
              disabled={blocked}
              onClick={() => edit({ kind: 'provider', initial: null, data })}
            >
              {t('Добавить подключение')}
            </button>
            <button
              className={s.secondary}
              disabled={blocked}
              onClick={() => edit({ kind: 'model', initial: null, data })}
            >
              {t('Добавить модель')}
            </button>
            <button
              className={s.secondary}
              disabled={blocked}
              onClick={() => edit({ kind: 'policy', data })}
            >
              {t('Правила маршрутизации')}
            </button>
            <button
              className={s.secondary}
              disabled={!!busy || resource.loading}
              onClick={resource.reload}
            >
              {t('Обновить')}
            </button>
          </div>
          <div ref={editorHost} tabIndex={-1}>
            {editor?.kind === 'provider' && (
              <ProviderEditor {...editor} done={done} cancel={() => setEditor(null)} />
            )}
            {editor?.kind === 'model' && (
              <ModelEditor {...editor} done={done} cancel={() => setEditor(null)} />
            )}
            {editor?.kind === 'policy' && (
              <PolicyEditor {...editor} done={done} cancel={() => setEditor(null)} />
            )}
          </div>
          <section className={a.section}>
            <h2>{t('Ваши подключения')}</h2>
            <p>
              {t(
                'Проверка запрашивает каталог моделей без учебных материалов и генерации. Доступный каталог не подтверждает качество модели или остаток средств.',
              )}
            </p>
            <div className={a.cards}>
              {data.providers.map((provider) => (
                <article className={a.card} key={provider.id}>
                  <header>
                    <h3>{provider.name}</h3>
                    <span className={a.badge} data-good={provider.available}>
                      {t(
                        !provider.enabled
                          ? 'Отключён'
                          : !provider.has_key
                            ? 'Нужен ключ'
                            : provider.available
                              ? 'В маршрутизации'
                              : 'Временно исключён',
                      )}
                    </span>
                  </header>
                  <p className={a.endpoint}>{provider.base_url}</p>
                  <p>
                    {t(
                      provider.credential_source === 'encrypted'
                        ? 'Ключ сохранён в зашифрованном виде'
                        : provider.credential_source === 'environment'
                          ? 'Ключ задан на сервере'
                          : provider.local
                            ? 'Локальный API без ключа'
                            : 'Ключ не задан',
                    )}
                  </p>
                  {provider.last_check && (
                    <p role='status'>
                      {t(checkLabels[provider.last_check.status] || 'Нет связи с API')}
                      {' · '}
                      {dateText(provider.last_check.checked_at)}
                    </p>
                  )}
                  <div className={s.row}>
                    <button
                      className={s.secondary}
                      disabled={blocked}
                      onClick={() => edit({ kind: 'provider', initial: provider, data })}
                    >
                      {t('Настроить')} {provider.name}
                    </button>
                    <button
                      className={s.secondary}
                      disabled={blocked || !provider.has_key}
                      onClick={() => void check(provider)}
                    >
                      {busy === provider.id ? t('Проверяем…') : t('Проверить API')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className={a.section}>
            <h2>{t('Модели и этапы генерации')}</h2>
            <p>
              {t(
                'Система сравнивает стоимость, качество и доступность всех разрешённых маршрутов до отправки запроса. Лимит контекста учитывает вход и резерв ответа.',
              )}
            </p>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>{t('Модель / провайдер')}</th>
                    <th>{t('Этапы работы')}</th>
                    <th>{t('₽ / 1 млн: вход · ответ')}</th>
                    <th>{t('Контекст / ответ')}</th>
                    <th>{t('Действия')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.models.map((model) => (
                    <tr key={`${model.provider}::${model.model}`}>
                      <td>
                        <strong>{model.model}</strong>
                        <br />
                        {model.provider}
                        <br />
                        <span className={a.badge} data-good={model.approved}>
                          {t(model.approved ? 'Допущена' : 'Не допущена')}
                        </span>
                      </td>
                      <td>{model.roles.map((role) => t(data.roles[role] || role)).join(', ')}</td>
                      <td>
                        {model.input_rub_per_million} · {model.output_rub_per_million}
                      </td>
                      <td>
                        {model.context_window.toLocaleString()} /{' '}
                        {model.max_output_tokens.toLocaleString()}
                      </td>
                      <td>
                        <button
                          className={s.secondary}
                          disabled={blocked}
                          aria-label={`${t('Настроить модель')} ${model.model} ${model.provider}`}
                          onClick={() => edit({ kind: 'model', initial: model, data })}
                        >
                          {t('Настроить')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className={a.section}>
            <h2>{t('Использование при генерации курсов')}</h2>
            <p>
              {t(
                'До 5 000 последних вызовов в запусках, начатых за 24 часа. Стоимость рассчитана по заданным тарифам без скидок кеша; это не счёт провайдера. Чаты, изображения и эмбеддинги в эту таблицу не входят.',
              )}
            </p>
            {data.stats_truncated && (
              <p>{t('Показана ограниченная выборка: последние 5 000 вызовов.')}</p>
            )}
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
                          {value.input_tokens.toLocaleString()} /{' '}
                          {value.output_tokens.toLocaleString()} /{' '}
                          {value.cached_tokens.toLocaleString()}
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
              <Empty>{t('Вызовов за этот период пока нет.')}</Empty>
            )}
          </section>
          <section className={a.section}>
            <h2>{t('Рекомендуемые провайдеры')}</h2>
            <div className={a.cards}>
              {data.catalog.map((preset) => (
                <article className={a.card} key={preset.id}>
                  <h3>{preset.name}</h3>
                  <p>{t(preset.purpose)}</p>
                  <div className={s.row}>
                    <button
                      disabled={blocked || data.providers.some((item) => item.id === preset.id)}
                      onClick={() => edit({ kind: 'provider', initial: preset, data })}
                    >
                      {t(
                        data.providers.some((item) => item.id === preset.id)
                          ? 'Уже добавлен'
                          : 'Подключить',
                      )}
                    </button>
                    <a href={preset.docs} target='_blank' rel='noreferrer'>
                      {t('Документация ↗')}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <aside className={s.notice}>
            <h3>{t('Резерв и данные')}</h3>
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
          </aside>
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
      title={t('AI-провайдеры')}
      description={t('Подключения, модели, расходы и правила выбора для каждого этапа.')}
      action={<Link to='/admin'>{t('Админка →')}</Link>}
    >
      {user?.is_admin ? <AIManagement /> : <Empty>{t('Доступ только оператору')}</Empty>}
    </Shell>
  );
}
