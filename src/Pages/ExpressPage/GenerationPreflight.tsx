import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  FileText,
  Globe2,
  ListChecks,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import AdminDialog from '@/Components/Admin/AdminDialog';
import { useLocale } from '@/i18n/useLocale';
import { pluralForm } from '@/i18n/plurals';
import type { GenerationSettings } from './CourseWizard';
import styles from './wizard.module.css';

export type Preflight = {
  allowed: boolean;
  reasons: string[];
  source_characters: number;
  source_bytes: number;
  ai_unlimited?: boolean;
  minimum_calls: number;
  calls_limit: number;
  output_token_reservation: number;
  tokens_limit: number;
  note: string;
  web_search?: {
    enabled: boolean;
    max_queries: number;
    reservation_rub: string;
    reservation_is_provider_bill: false;
    no_automatic_retry: boolean;
  };
};

export default function GenerationPreflight({
  settings,
  preflight,
  sourceCount,
  busy,
  webSearchEnabled = true,
  onPrepare,
  onGenerate,
  onBack,
}: {
  settings: GenerationSettings;
  preflight: Preflight | null;
  sourceCount: number;
  busy: boolean;
  webSearchEnabled?: boolean;
  onPrepare: () => void;
  onGenerate: () => void;
  onBack: () => void;
}) {
  const { t, locale } = useLocale();
  const number = (value: number) => value.toLocaleString(locale === 'en' ? 'en-GB' : 'ru-RU');
  const counted = (value: number, one: string, few: string, many: string) =>
    t(pluralForm(locale, value, one, few, many));
  const ready = preflight?.allowed;
  return (
    <AdminDialog
      title={t('Запустить генерацию?')}
      onClose={onBack}
      busy={busy}
      className={styles.preflightDialog}
    >
      <section className={styles.preflight}>
        <div className={styles.courseSummary}>
          <span className={styles.eyebrow}>{t('Ваш курс')}</span>
          <h3>{settings.title || t('Название ещё не задано')}</h3>
          <p>{settings.goal}</p>
          {settings.target_audience && (
            <p>
              <strong>{t('Для кого:')} </strong>
              {settings.target_audience}
            </p>
          )}
        </div>
        <dl className={styles.preflightFacts}>
          <div>
            <FileText aria-hidden='true' />
            <dt>{t('Документы')}</dt>
            <dd>
              {sourceCount}
              <small>
                {counted(sourceCount, 'источник выбран', 'источника выбрано', 'источников выбрано')}
              </small>
            </dd>
          </div>
          <div>
            <BookOpen aria-hidden='true' />
            <dt>{t('Объём курса')}</dt>
            <dd>
              {settings.lesson_count}
              <small>
                {counted(settings.lesson_count, 'урок в плане', 'урока в плане', 'уроков в плане')}
              </small>
            </dd>
          </div>
          <div>
            <ListChecks aria-hidden='true' />
            <dt>{t('Проверка знаний')}</dt>
            <dd className={styles.testSummary}>
              {settings.module_tests_enabled && settings.final_test_enabled
                ? t('Тесты + итоговый')
                : settings.module_tests_enabled
                  ? t('После модулей')
                  : settings.final_test_enabled
                    ? t('Итоговый тест')
                    : t('Без тестов')}
              <small>{t('по вашим настройкам')}</small>
            </dd>
          </div>
        </dl>
        <div className={styles.webSearchSummary}>
          <Globe2 size={20} aria-hidden='true' />
          <p>
            {webSearchEnabled && preflight?.web_search?.enabled === false
              ? locale === 'en'
                ? 'Internet search is currently unavailable. Your uploaded documents remain available.'
                : 'Поиск в интернете сейчас недоступен. Загруженные документы сохраняются.'
              : locale === 'en'
                ? webSearchEnabled
                  ? 'If your materials leave gaps, we will search the internet and keep source links for review.'
                  : 'Internet search is off. Only your selected documents will be used.'
                : webSearchEnabled
                  ? 'Если в материалах есть пробелы, найдём дополнения в интернете и сохраним ссылки для проверки.'
                  : 'Поиск в интернете выключен. Используем только выбранные документы.'}
          </p>
        </div>
        <details className={styles.preflightNext}>
          <summary>{t('Что произойдёт дальше')}</summary>
          <ol>
            <li>
              <span>1</span>
              <div>
                <strong>{t('Разберём материалы')}</strong>
                <p>{t('Выделим ключевые темы и соберём логичный учебный план.')}</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>{t('Подготовим курс')}</strong>
                <p>
                  {t(
                    'Создадим уроки и выбранные проверки знаний. Ход работы будет виден на экране.',
                  )}
                </p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>{t('Передадим вам на проверку')}</strong>
                <p>
                  {t(
                    'Курс сохранится как черновик. Ученики увидят его только после вашей публикации и назначения.',
                  )}
                </p>
              </div>
            </li>
          </ol>
        </details>
        {preflight ? (
          <>
            <div
              className={`${styles.preflightStatus} ${ready ? styles.ready : styles.needsAttention}`}
              role={ready ? 'status' : 'alert'}
            >
              {ready ? <ShieldCheck aria-hidden='true' /> : <TriangleAlert aria-hidden='true' />}
              <div>
                <strong>
                  {ready
                    ? t('Предварительная проверка пройдена')
                    : t('Нужно скорректировать параметры')}
                </strong>
                <p>
                  {ready
                    ? t(
                        'Источники доступны, выбранный объём укладывается в лимиты одного запуска. Доступная квота будет повторно проверена при старте.',
                      )
                    : t('Генерация пока не запущена. Ваши документы и настройки сохранены.')}
                </p>
                {!ready && (
                  <ul>
                    {preflight.reasons.map((reason) => (
                      <li key={reason}>{t(reason)}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <details className={styles.resourceDetails}>
              <summary>{t('Ресурсы и ограничения генерации')}</summary>
              <dl>
                <div>
                  <dt>{t('Обработанные источники')}</dt>
                  <dd>
                    {number(preflight.source_characters)} {t('символов')} ·{' '}
                    {number(Math.round(preflight.source_bytes / 1024))} {t('КБ')}
                  </dd>
                </div>
                <div>
                  <dt>{t('Минимум обращений к ИИ')}</dt>
                  <dd>
                    {number(preflight.minimum_calls)} /{' '}
                    {preflight.ai_unlimited ? t('Без лимита') : number(preflight.calls_limit)}
                  </dd>
                </div>
                <div>
                  <dt>{t('Резерв для текста ответа')}</dt>
                  <dd>
                    {number(preflight.output_token_reservation)} /{' '}
                    {preflight.ai_unlimited ? t('Без лимита') : number(preflight.tokens_limit)}{' '}
                    {t('токенов')}
                  </dd>
                </div>
              </dl>
              <p>{t(preflight.note)}</p>
              <p>
                {t(
                  'Это предварительный расчёт, а не окончательная стоимость. Сервер учитывает фактические обращения, чтение источников и исправления.',
                )}
              </p>
            </details>
          </>
        ) : (
          <div className={styles.preflightStatus}>
            <Check aria-hidden='true' />
            <p>{t('Перед запуском проверим источники, количество уроков и доступный бюджет.')}</p>
          </div>
        )}
        <footer className={styles.preflightFooter}>
          <button disabled={busy} onClick={onBack}>
            <ArrowLeft size={18} aria-hidden='true' />
            {t('Изменить настройки')}
          </button>
          <button
            className={styles.primary}
            disabled={busy || (preflight !== null && !ready)}
            onClick={preflight ? onGenerate : onPrepare}
          >
            {busy
              ? t('Подготавливаем…')
              : preflight
                ? t('Сгенерировать курс')
                : t('Проверить параметры')}
            <ArrowRight size={18} aria-hidden='true' />
          </button>
        </footer>
        <p className={styles.preflightFootnote}>
          {t('Генерация не публикует курс автоматически. Ваши исходные документы сохранятся.')}
        </p>
      </section>
    </AdminDialog>
  );
}
