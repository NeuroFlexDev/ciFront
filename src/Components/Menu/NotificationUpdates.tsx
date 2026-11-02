import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '@/i18n/useLocale';
import { useLearningData } from '@/Pages/Learning/useLearningData';
import { LoadingState, RequestError } from '@/Components/RequestState';
import { api } from '@/shared/api';
import styles from './notifications.module.css';

type Notice = {
  id: number;
  category: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
  resource_type: string;
  resource_id: number;
};
type Inbox = {
  items: Notice[];
  unread_count: number;
  latest_id: number;
  next_cursor: number | null;
};
function destination(item: Notice) {
  if (!Number.isSafeInteger(item.resource_id) || item.resource_id < 1) return '/notifications';
  if (item.resource_type === 'assignment') return `/learning/${item.resource_id}`;
  if (item.resource_type === 'review') return '/reviews';
  if (item.resource_type === 'course') return `/courses/${item.resource_id}/edit`;
  return '/notifications';
}

export function NotificationUpdates({ author, close }: { author: boolean; close: () => void }) {
  const { t, locale } = useLocale();
  const [filter, setFilter] = useState('all');
  const [cursor, setCursor] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const resource = useLearningData<Inbox>(
    '/notifications?limit=30' +
      (cursor ? `&before_id=${cursor}` : '') +
      (filter === 'unread' ? '&unread=true' : filter !== 'all' ? `&category=${filter}` : ''),
  );
  async function mark(id?: number) {
    setBusy(true);
    setError(null);
    try {
      if (id) await api.post(`/notifications/${id}/read`);
      else await api.post('/notifications/read-all', { through_id: resource.data?.latest_id ?? 0 });
      await resource.reload();
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className={styles.heading}>
        <h2>{t('Уведомления')}</h2>
        <button disabled={busy || !resource.data?.unread_count} onClick={() => void mark()}>
          {t('Прочитать все')}
        </button>
      </header>
      <nav className={styles.filters} aria-label={t('Фильтр уведомлений')}>
        {[
          ['all', t('Все')],
          ['unread', `${t('Непрочитанные')} · ${resource.data?.unread_count ?? 0}`],
          ['assignment', t('Обучение')],
          ['result', t('Результаты')],
          ...(author
            ? [
                ['review', t('Проверки')],
                ['generation', t('Генерации')],
              ]
            : []),
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={filter === id}
            onClick={() => {
              setFilter(id);
              setCursor(null);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {resource.loading && !resource.data && <LoadingState />}
      {!!(resource.error || error) && (
        <RequestError error={resource.error || error} onRetry={() => void resource.reload()} />
      )}
      <div className={styles.items}>
        {resource.data?.items.map((item) => (
          <Link
            key={item.id}
            to={destination(item)}
            data-unread={!item.read_at}
            onClick={() => {
              void mark(item.id);
              close();
            }}
          >
            <span
              className={styles.eventIcon}
              data-warning={item.category === 'deadline'}
              aria-hidden='true'
            >
              {item.category === 'deadline' ? '!' : '✓'}
            </span>
            <span>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
              <time dateTime={item.created_at}>
                {new Date(
                  /[zZ]|[+-]\d\d:\d\d$/.test(item.created_at)
                    ? item.created_at
                    : item.created_at + 'Z',
                ).toLocaleDateString(locale === 'en' ? 'en-GB' : 'ru-RU', {
                  day: 'numeric',
                  month: 'short',
                })}
              </time>
            </span>
          </Link>
        ))}
      </div>
      {!resource.loading && !resource.error && !resource.data?.items.length && (
        <p className={styles.empty}>
          {t(
            filter === 'unread'
              ? 'Все уведомления прочитаны'
              : 'Здесь появятся назначения обучения и результаты генерации.',
          )}
        </p>
      )}
      {resource.data?.next_cursor && (
        <button disabled={busy} onClick={() => setCursor(resource.data!.next_cursor)}>
          {t('Показать ещё')}
        </button>
      )}
      {cursor && <button onClick={() => setCursor(null)}>{t('Назад')}</button>}
      <Link className={styles.settings} to='/account?tab=notifications' onClick={close}>
        {t('Настройки уведомлений')}
      </Link>
    </>
  );
}
