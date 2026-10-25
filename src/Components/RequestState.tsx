import { useLocale } from '@/i18n/useLocale';
import { type ReactNode } from 'react';
import { describeError } from '@/shared/errors';
import './requestState.css';
import LanguageSwitch from './LanguageSwitch';

export function RequestError({
  error,
  onRetry,
  retrying = false,
  fullPage = false,
}: {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  fullPage?: boolean;
}) {
  const { t, locale } = useLocale();

  const info = describeError(error);
  const translatedMessage = t(info.message);
  const originalDetail =
    locale === 'en' && translatedMessage === info.message && /[А-Яа-яЁё]/.test(info.message);
  const Heading = fullPage ? 'h1' : 'h2';
  return (
    <section className={`request-state ${fullPage ? 'request-state--page' : ''}`} role='alert'>
      <span className='request-state__code' data-numeric={/^\d{3}$/.test(info.code)}>
        {t(info.code)}
      </span>
      <Heading>{t(info.title)}</Heading>
      <p>
        {originalDetail
          ? t(
              'Проверьте введённые данные и повторите действие. Подробности доступны в исходном сообщении сервера.',
            )
          : translatedMessage}
      </p>
      {originalDetail && (
        <details>
          <summary>{t('Исходное сообщение сервера')}</summary>
          <p lang='ru'>{info.message}</p>
        </details>
      )}
      <div className='request-state__actions'>
        {onRetry && info.retryable && (
          <button type='button' disabled={retrying} onClick={onRetry}>
            {retrying ? t('Пробуем снова…') : t('Повторить загрузку')}
          </button>
        )}
        <a href='/dashboard'>{t('В рабочее пространство')}</a>
        <a href='/legal/contacts/'>{t('Помощь')}</a>
      </div>
    </section>
  );
}

export function LoadingState({ children }: { children?: ReactNode }) {
  const { t } = useLocale();
  return (
    <p className='request-loading' role='status'>
      {children ?? t('Загружаем данные…')}
    </p>
  );
}

export function StatusScreen({
  code,
  title,
  children,
  actions,
}: {
  code: string;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <main className='status-screen'>
      <LanguageSwitch />
      <section className='request-state request-state--page' role='alert'>
        <span className='request-state__code' data-numeric={/^\d{3}$/.test(code)}>
          {code}
        </span>
        <h1>{title}</h1>
        <div className='status-screen__description'>{children}</div>
        <div className='request-state__actions'>{actions}</div>
      </section>
    </main>
  );
}
