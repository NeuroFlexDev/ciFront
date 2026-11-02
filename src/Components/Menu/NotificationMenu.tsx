import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLocale } from '@/i18n/useLocale';
import { useAuth } from '@/auth/useAuth';
import { NotificationUpdates } from './NotificationUpdates';
export { NotificationUpdates } from './NotificationUpdates';
import bell from '@/assets/figma/notification.svg';
import styles from './notifications.module.css';

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
          <NotificationUpdates key={user?.id} author={author} close={() => setOpen(false)} />
        </section>
      )}
    </div>
  );
}
