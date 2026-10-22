import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  FileText,
  Layers3,
  Pause,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { api } from '@/shared/api';
import { useLocale } from '@/i18n/useLocale';
import { RequestError } from '@/Components/RequestState';
import {
  generationActive,
  generationSucceeded,
  generationTimestamp,
  readGenerationPlan,
  type GenerationConnection,
  type GenerationPlan,
  type GenerationRun,
} from './types';
import styles from './styles.module.css';

const stageDetails: Record<string, { title: string; description: string }> = {
  ingestion: {
    title: 'Анализ материалов',
    description: 'Выделяем знания и связи в выбранных источниках',
  },
  competency_mapping: {
    title: 'Учебные цели',
    description: 'Связываем знания с навыками и результатами обучения',
  },
  course_architecture: {
    title: 'Структура курса',
    description: 'Распределяем темы по модулям и урокам',
  },
  lesson_writing: {
    title: 'Написание уроков',
    description: 'Готовим объяснения, примеры и практику по источникам',
  },
  assessment_generation: {
    title: 'Задания и тесты',
    description: 'Создаём задания и критерии оценки',
  },
  quality_assurance: {
    title: 'Проверка качества',
    description: 'Проверяем полноту, источники и согласованность материалов',
  },
  materialization: {
    title: 'Сохранение курса',
    description: 'Собираем материалы в редакторе для вашей проверки',
  },
};

type Props = {
  run: GenerationRun | null;
  courseId: number | null;
  title?: string;
  connection?: GenerationConnection;
  receivedAt?: number | null;
  submission?: 'idle' | 'submitting' | 'uncertain';
  busy?: boolean;
  stopping?: boolean;
  error?: unknown;
  onRefresh: () => void;
  onResume: () => void;
  onCancel: () => void;
  onEditSettings: () => void;
  onRetrySubmission: () => void;
};

function elapsedText(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  return `${hours ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function GenerationProgress({
  run,
  courseId,
  title,
  connection = 'loading',
  receivedAt = null,
  submission = 'idle',
  busy = false,
  stopping = false,
  error,
  onRefresh,
  onResume,
  onCancel,
  onEditSettings,
  onRetrySubmission,
}: Props) {
  const { t, locale } = useLocale();
  const headingId = useId();
  const [now, setNow] = useState(Date.now);
  const [planState, setPlanState] = useState<{
    id: number;
    plan: GenerationPlan | null;
    error: unknown;
  } | null>(null);
  const [planRevision, setPlanRevision] = useState(0);
  const active = generationActive(run);
  const done = generationSucceeded(run);
  const paused = run?.status === 'paused';
  const failed = run?.status === 'failed';
  const queued = run?.status === 'queued';
  const disconnected =
    connection === 'reconnecting' || connection === 'session' || connection === 'unavailable';
  const working =
    !disconnected &&
    (active || submission === 'submitting' || (!run && submission === 'idle' && !error));
  const planReady = Boolean(
    run?.stages.some(
      (stage) => stage.code === 'course_architecture' && stage.status === 'completed',
    ),
  );
  const runId = run?.run_id;
  const runStage = run?.current_stage;
  const plan = planState && planState.id === runId ? planState.plan : null;
  const planError = planState && planState.id === runId ? planState.error : null;
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active, runId]);
  useEffect(() => {
    if (!runId || !planReady || disconnected) return;
    let current = true;
    api
      .get<unknown>(`/generation-runs/${runId}/artifacts`)
      .then(({ data }) => {
        if (current)
          setPlanState({ id: runId, plan: readGenerationPlan(data, runId), error: null });
      })
      .catch((reason) => {
        if (current)
          setPlanState((previous) => ({
            id: runId,
            plan: previous?.id === runId ? previous.plan : null,
            error: reason,
          }));
      });
    return () => {
      current = false;
    };
    // A stage transition may contain a repaired course plan. No full-artifact polling.
  }, [runId, planReady, runStage, planRevision, disconnected]);

  const heading =
    submission === 'submitting'
      ? 'Запускаем генерацию'
      : submission === 'uncertain'
        ? 'Проверим, принят ли запуск'
        : done
          ? 'Курс готов к проверке'
          : paused
            ? 'Прогресс сохранён'
            : failed
              ? 'Генерация остановлена'
              : 'Генерация курса';
  const description =
    submission === 'submitting'
      ? 'Передаём настройки и выбранные источники. Дождитесь подтверждения запуска.'
      : submission === 'uncertain'
        ? 'Ответ о запуске не получен. Проверка использует тот же запрос и не создаёт второй курс.'
        : done
          ? 'Материалы сохранены. Проверьте курс в редакторе перед публикацией.'
          : paused
            ? 'Завершённые этапы сохранены. Продолжение начнётся с доступной контрольной точки.'
            : failed
              ? 'Посмотрите причину ниже. Готовые этапы сохраняются для доступного повторного запуска.'
              : queued
                ? 'Запуск принят. Ожидаем свободного исполнителя на сервере.'
                : !run
                  ? 'Получаем сохранённое состояние запуска. Повторно запускать генерацию не нужно.'
                  : 'ИИ анализирует ваши документы и создаёт курс';
  const currentTitle = run?.stages.find((stage) => stage.code === run.current_stage)?.title;
  const stageTitle = (run?.current_stage && stageDetails[run.current_stage]?.title) || currentTitle;
  const progress =
    typeof run?.progress_percent === 'number' &&
    Number.isFinite(run.progress_percent) &&
    run.progress_percent >= 0 &&
    run.progress_percent <= 100
      ? run.progress_percent
      : null;
  const start = generationTimestamp(queued ? (run?.queued_at ?? run?.created_at) : run?.started_at);
  const end = active
    ? disconnected
      ? receivedAt
      : now
    : (generationTimestamp(run?.finished_at) ?? receivedAt);
  const duration = start !== null && end !== null ? elapsedText(end - start) : null;
  const courseTitle = plan?.title || run?.settings_snapshot?.title || title;
  const approvedPlan = run?.settings_snapshot?.approved_plan ?? [];
  const stages = run?.stages.length
    ? run.stages
    : Object.entries(stageDetails).map(([code, item]) => ({
        code,
        title: item.title,
        status: 'pending',
      }));
  const liveStatus =
    connection === 'session'
      ? 'Войдите снова, чтобы получать обновления'
      : connection === 'unavailable'
        ? 'Состояние запуска недоступно'
        : disconnected
          ? 'Восстанавливаем связь'
          : stopping && active
            ? 'Останавливаем после текущего запроса'
            : submission === 'submitting'
              ? 'Ожидаем подтверждение сервера'
              : submission === 'uncertain'
                ? 'Нужно проверить запуск'
                : queued
                  ? 'В очереди'
                  : done
                    ? 'Все этапы завершены'
                    : paused
                      ? 'На паузе'
                      : failed
                        ? 'Нужна ваша помощь'
                        : stageTitle || 'Получаем состояние';

  return (
    <section className={styles.root} aria-labelledby={headingId} data-working={working}>
      <header className={styles.header}>
        <div className={styles.mark} aria-hidden='true'>
          {done ? (
            <Check />
          ) : paused || failed ? (
            <Pause />
          ) : (
            <>
              <i />
              <i />
              <i />
            </>
          )}
        </div>
        <div className={styles.eyebrow}>{t('Создание по вашим материалам')}</div>
        <h2 id={headingId}>{t(heading)}</h2>
        <p>{t(description)}</p>
      </header>
      <div className={styles.meter}>
        <div className={styles.meterLabel}>
          <span>
            {t(disconnected ? 'Последний подтверждённый прогресс' : 'Прогресс по этапам')}
          </span>
          {progress !== null && <strong>{progress}%</strong>}
        </div>
        <div
          className={styles.track}
          role='progressbar'
          aria-label={t('Прогресс генерации курса')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress ?? undefined}
          aria-valuetext={progress === null ? t(liveStatus) : `${progress}% · ${t(liveStatus)}`}
        >
          <span
            className={progress === null ? styles.indeterminate : styles.fill}
            style={progress === null ? undefined : { width: `${progress}%` }}
          />
        </div>
        <div className={styles.liveRow}>
          <span className={styles.liveStatus} role='status' aria-live='polite'>
            {disconnected ? (
              <WifiOff size={16} aria-hidden='true' />
            ) : (
              <span className={styles.liveDot} aria-hidden='true' />
            )}
            {t(liveStatus)}
          </span>
          {duration && (
            <span className={styles.elapsed}>
              <Clock3 size={15} aria-hidden='true' />
              {t(queued ? 'В очереди' : 'Прошло')}: <time>{duration}</time>
            </span>
          )}
        </div>
        {active && (
          <p className={styles.progressNote}>
            {t('Процент меняется после перехода между этапами, а не по таймеру.')}
          </p>
        )}
      </div>
      {disconnected && (
        <aside className={styles.connection}>
          <WifiOff aria-hidden='true' />
          <div>
            <strong>
              {t(
                connection === 'session'
                  ? 'Нужно обновить сеанс'
                  : connection === 'unavailable'
                    ? 'Состояние запуска недоступно'
                    : 'Обновления временно недоступны',
              )}
            </strong>
            <p>
              {t(
                connection === 'session'
                  ? 'После входа наблюдение продолжится автоматически. Новый запуск не потребуется.'
                  : connection === 'unavailable'
                    ? 'Автоматическое обновление приостановлено. Проверьте доступ к курсу или вернитесь в рабочее пространство.'
                    : 'Это не означает остановку генерации. Показываем последнее полученное состояние и проверяем связь.',
              )}
            </p>
            {receivedAt && (
              <small>
                {t('Последний ответ сервера')}:{' '}
                {new Date(receivedAt).toLocaleTimeString(locale === 'en' ? 'en-GB' : 'ru-RU')}
              </small>
            )}
          </div>
        </aside>
      )}
      {!!error && (
        <RequestError
          error={error}
          onRetry={submission === 'uncertain' ? undefined : onRefresh}
          retrying={busy}
        />
      )}
      {run?.status_error && (
        <div className={styles.failure} role='alert'>
          <strong>{t('Не удалось завершить текущий этап')}</strong>
          <p>{t(run.status_error.message)}</p>
        </div>
      )}
      {run?.status_notice && (
        <p className={styles.notice} role='status'>
          {t(run.status_notice)}
        </p>
      )}
      <div className={styles.workspace}>
        <ol className={styles.stages} aria-label={t('Этапы генерации')}>
          {stages.map((stage, index) => {
            const stageDone = stage.status === 'completed';
            const current = stage.code === run?.current_stage;
            const state = stageDone
              ? 'done'
              : current && failed
                ? 'failed'
                : current && paused
                  ? 'paused'
                  : stage.status === 'running' && !queued
                    ? 'active'
                    : 'pending';
            const label = stageDone
              ? 'Готово'
              : current && failed
                ? 'Ошибка'
                : current && paused
                  ? 'На паузе'
                  : state === 'active'
                    ? disconnected
                      ? 'Последний этап'
                      : 'В работе'
                    : 'Ожидание';
            return (
              <li
                className={styles.stage}
                key={stage.code}
                data-state={state}
                aria-current={state === 'active' ? 'step' : undefined}
              >
                <span className={styles.stageIcon} aria-hidden='true'>
                  {stageDone ? (
                    <Check size={17} />
                  ) : current && (paused || failed) ? (
                    <Pause size={16} />
                  ) : (
                    <span>{String(index + 1).padStart(2, '0')}</span>
                  )}
                </span>
                <div>
                  <h3>{t(stageDetails[stage.code]?.title ?? stage.title)}</h3>
                  <p>
                    {t(stageDetails[stage.code]?.description ?? 'Состояние сообщается сервером')}
                  </p>
                </div>
                <span className={styles.stageStatus}>
                  {state === 'active' && working && (
                    <span className={styles.miniSpinner} aria-hidden='true' />
                  )}
                  {t(label)}
                </span>
              </li>
            );
          })}
        </ol>
        <aside className={styles.preview} aria-label={t('Предпросмотр структуры курса')}>
          <div className={styles.previewHeading}>
            <Layers3 size={20} aria-hidden='true' />
            <h3>{t('Ваш курс')}</h3>
          </div>
          {courseTitle && <h4>{courseTitle}</h4>}
          <p>
            {t(
              done
                ? 'Структура сохранённого курса. Все материалы доступны в редакторе.'
                : plan
                  ? 'Структура из сохранённого этапа. Содержание ещё проверяется до завершения генерации.'
                  : approvedPlan.length
                    ? 'Ваш подтверждённый план. Содержание уроков появится после генерации.'
                    : 'Здесь появятся реальные модули и уроки после сохранения структуры.',
            )}
          </p>
          {plan ? (
            <div className={styles.outline}>
              {plan.modules.map((module) => (
                <section key={module.id}>
                  <strong>
                    <BookOpen size={15} aria-hidden='true' />
                    {module.title}
                  </strong>
                  <ol>
                    {module.lessons.map((lesson, index) => (
                      <li key={`${module.id}-${index}`}>{lesson}</li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          ) : approvedPlan.length ? (
            <ol className={styles.approvedPlan}>
              {approvedPlan.map((lesson, index) => (
                <li key={index}>{lesson}</li>
              ))}
            </ol>
          ) : done ? (
            <div className={styles.previewReady}>
              <Check size={22} aria-hidden='true' />
              {t('Готово к редактированию')}
            </div>
          ) : (
            <div className={styles.skeleton} aria-hidden='true'>
              <span />
              <span />
              <span />
              <div />
              <span />
              <span />
            </div>
          )}
          {!!planError && (
            <div className={styles.previewError}>
              <p>{t('Не удалось загрузить структуру. Прогресс генерации сохранён.')}</p>
              <button type='button' onClick={() => setPlanRevision((value) => value + 1)}>
                {t('Обновить структуру')}
              </button>
            </div>
          )}
          <div className={styles.previewFooter}>
            <FileText size={16} aria-hidden='true' />
            {t('Перед публикацией вы сможете всё отредактировать')}
          </div>
        </aside>
      </div>
      <footer className={styles.footer}>
        <div className={styles.actions}>
          {submission === 'uncertain' && (
            <>
              <button className={styles.primary} disabled={busy} onClick={onRetrySubmission}>
                <RefreshCw size={18} />
                {t('Проверить запуск')}
              </button>
              <button disabled={busy} onClick={onEditSettings}>
                {t('Вернуться к проверке параметров')}
              </button>
            </>
          )}
          {paused && (
            <button className={styles.primary} disabled={busy || disconnected} onClick={onResume}>
              <Sparkles size={18} />
              {t(busy ? 'Запрашиваем продолжение…' : 'Продолжить генерацию')}
            </button>
          )}
          {failed && run?.status_error?.retryable && (
            <button className={styles.primary} disabled={busy || disconnected} onClick={onResume}>
              <RefreshCw size={18} />
              {t(busy ? 'Запрашиваем продолжение…' : 'Повторить генерацию')}
            </button>
          )}
          {active && (
            <button disabled={busy || stopping || disconnected} onClick={onCancel}>
              <Pause size={17} />
              {t(stopping ? 'Останавливаем…' : busy ? 'Отправляем запрос остановки…' : 'Остановить после текущего этапа')}
            </button>
          )}
          {done && (
            <Link className={styles.primary} to={`/courses/${run?.course_id ?? courseId}/edit`}>
              {t('Проверить и опубликовать курс')}
              <ArrowRight size={18} />
            </Link>
          )}
          {failed && (
            <button disabled={busy} onClick={onEditSettings}>
              {t('Изменить параметры курса')}
            </button>
          )}
          {run && (
            <Link className={styles.dashboardLink} to='/dashboard'>
              {t('В рабочее пространство')}
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
        <p className={styles.savedNote}>
          <ShieldCheck size={18} aria-hidden='true' />
          {t(
            run
              ? 'Материалы и завершённые этапы сохраняются на сервере. К запуску можно вернуться по этому адресу или из дашборда.'
              : 'Настройки сохранены в черновике. Дождитесь подтверждения запуска перед закрытием страницы.',
          )}
        </p>
      </footer>
    </section>
  );
}
