import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLocale } from '@/i18n/useLocale';
import { useAuth } from '@/auth/useAuth';
import { useLearningData } from '@/Pages/Learning/useLearningData';
import type { Assignment } from '@/Pages/Learning/types';
import type { Overview } from '@/Pages/Workspace/shared';
import { LoadingState, RequestError } from '@/Components/RequestState';
import bell from '@/assets/figma/notification.svg';
import styles from './notifications.module.css';

type Update = {
  id: string;
  category: 'learning' | 'generation';
  title: string;
  description: string;
  at: string;
  href: string;
  warning?: boolean;
};

function Updates({ author, close }: { author: boolean; close: () => void }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const assignments = useLearningData<{ items: Assignment[] }>(
    user?.organization_id ? '/learning/assignments?limit=24' : null,
  );
  const overview = useLearningData<Overview>(author ? '/workspace/overview' : null);
  const storageKey = `lernium:read-updates:${user?.id}`;
  const [read, setRead] = useState<string[]>(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });
  const [storageFailed, setStorageFailed] = useState(false);
  const [filter, setFilter] = useState('all');
  const updates: Update[] = [
    ...(assignments.data?.items ?? [])
      .filter((a) => a.state !== 'revoked')
      .map((a) => ({
        id: `learning:${a.id}:${a.status}:${a.completed_at ?? ''}`,
        category: 'learning' as const,
        title: t(
          a.status === 'completed'
            ? 'Курс завершён'
            : a.status === 'overdue'
              ? 'Срок прохождения истёк'
              : 'Вам назначено обучение',
        ),
        description: a.title,
        at: a.completed_at || (a.status === 'overdue' ? a.due_at : null) || a.created_at,
        href: `/learning/${a.id}`,
        warning: a.status === 'overdue',
      })),
    ...(overview.data?.runs ?? [])
      .filter(
        (r) => ['completed', 'succeeded', 'failed', 'paused'].includes(r.status) && r.course_id,
      )
      .map((r) => ({
        id: `generation:${r.id}:${r.status}`,
        category: 'generation' as const,
        title: t(
          ['completed', 'succeeded'].includes(r.status)
            ? 'Генерация завершена'
            : r.status === 'failed'
              ? 'Генерация требует внимания'
              : 'Генерация приостановлена',
        ),
        description:
          overview.data?.courses.find((c) => c.id === r.course_id)?.title ||
          t('Курс №{v0}', { v0: r.course_id! }),
        at: r.created_at,
        href: ['completed', 'succeeded'].includes(r.status)
          ? `/courses/${r.course_id}/edit`
          : `/express?course=${r.course_id}&run=${r.id}`,
        warning: !['completed', 'succeeded'].includes(r.status),
      })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 24);
  function mark(ids: string[]) {
    const next = Array.from(new Set([...read, ...ids])).slice(-500);
    setRead(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageFailed(false);
    } catch {
      setStorageFailed(true);
    }
  }
  const visible = updates.filter(
    (item) =>
      filter === 'all' ||
      (filter === 'unread' ? !read.includes(item.id) : item.category === filter),
  );
  const loading = assignments.loading || overview.loading;
  return (
    <>
      <header className={styles.heading}>
        <h2>{t('Уведомления')}</h2>
        <button
          disabled={!updates.some((item) => !read.includes(item.id))}
          onClick={() => mark(updates.map((item) => item.id))}
        >
          {t('Прочитать все')}
        </button>
      </header>
      <nav className={styles.filters} aria-label={t('Фильтр уведомлений')}>
        {[
          ['all', t('Все')],
          [
            'unread',
            `${t('Непрочитанные')} · ${updates.filter((item) => !read.includes(item.id)).length}`,
          ],
          ['learning', t('Обучение')],
          ...(author ? [['generation', t('Генерации')]] : []),
        ].map(([id, label]) => (
          <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </nav>
      {loading && !updates.length && <LoadingState />}
      {[assignments, overview].map((resource, index) =>
        resource.error ? (
          <RequestError key={index} error={resource.error} onRetry={() => void resource.reload()} />
        ) : null,
      )}
      <div className={styles.items}>
        {visible.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            data-unread={!read.includes(item.id)}
            onClick={() => {
              mark([item.id]);
              close();
            }}
          >
            <span className={styles.eventIcon} data-warning={item.warning} aria-hidden='true'>
              {item.warning ? '!' : item.category === 'generation' ? '✓' : '↗'}
            </span>
            <span>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
              <time dateTime={item.at}>
                {new Date(item.at).toLocaleDateString(locale === 'en' ? 'en-GB' : 'ru-RU', {
                  day: 'numeric',
                  month: 'short',
                })}
              </time>
            </span>
          </Link>
        ))}
      </div>
      {!loading && !assignments.error && !overview.error && !visible.length && (
        <p className={styles.empty}>
          {t(
            filter === 'unread'
              ? 'Все уведомления прочитаны'
              : 'Здесь появятся назначения обучения и результаты генерации.',
          )}
        </p>
      )}
      <p className={styles.storage} role={storageFailed ? 'alert' : undefined}>
        {t(
          storageFailed
            ? 'Не удалось сохранить отметки прочтения на устройстве.'
            : 'Отметки прочтения сохраняются на этом устройстве.',
        )}
      </p>
      <Link className={styles.settings} to='/account?tab=notifications' onClick={close}>
        {t('Настройки уведомлений')}
      </Link>
    </>
  );
}

export default function NotificationMenu({ author }: { author: boolean }) {
  const { t } = useLocale();
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [location.pathname, location.search, user?.id]);
  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', pointer);
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('pointerdown', pointer);
      document.removeEventListener('keydown', keyboard);
    };
  }, [open]);
  return (
    <div className={styles.root} ref={ref}>
      <button
        ref={trigger}
        className={styles.trigger}
        aria-label={t('Уведомления')}
        aria-expanded={open}
        aria-controls='notification-center'
        onClick={() => setOpen((value) => !value)}
      >
        <img src={bell} alt='' />
      </button>
      {open && (
        <section
          id='notification-center'
          className={styles.panel}
          aria-label={t('Центр уведомлений')}
        >
          <Updates key={user?.id} author={author} close={() => setOpen(false)} />
        </section>
      )}
    </div>
  );
}
