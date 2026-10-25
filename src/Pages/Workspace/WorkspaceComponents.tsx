import { useLocale } from '@/i18n/useLocale';
import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Menu from '@/Components/Menu/Menu';
import styles from './workspace.module.css';
import { isAdminSurface } from '@/shared/surface';
export function Shell({
  title,
  description,
  action,
  className = '',
  readerHeader,
  breadcrumbs,
  children,
}: PropsWithChildren<{
  className?: string;
  readerHeader?: ReactNode;
  breadcrumbs?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}>) {
  const { t } = useLocale();
  const location = useLocation();
  const monitoring =
    isAdminSurface &&
    ['/admin/operations', '/admin/ai', '/support-access'].includes(location.pathname);
  return (
    <>
      {!readerHeader && <Menu />}
      <main className={`${styles.page} ${isAdminSurface ? styles.adminPage : ''} ${className}`}>
        {breadcrumbs}
        {readerHeader || (
          <header className={styles.heading}>
            <div>
              <h1>{title}</h1>
              {description && <p>{description}</p>}
            </div>
            {action}
          </header>
        )}
        {monitoring && (
          <nav className={styles.adminSubnav} aria-label={t('Разделы мониторинга')}>
            {[
              ['/admin/operations', 'Генерации и сбои'],
              ['/admin/ai', 'AI-настройки'],
              ['/support-access', 'Доступ поддержки'],
            ].map(([to, label]) => (
              <NavLink key={to} to={to}>
                {t(label)}
              </NavLink>
            ))}
          </nav>
        )}
        {children}
      </main>
    </>
  );
}
export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.stat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
export function CopyLink({ url, title }: { url: string; title?: string }) {
  const { t } = useLocale();

  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <section className={styles.linkBox}>
      <h3>{title ?? t('Приглашение готово')}</h3>
      <p>
        {t(
          'Передайте ссылку нужному человеку лично. После закрытия страницы она не отображается повторно.',
        )}
      </p>
      <label>
        {t('Ссылка для передачи')}
        <input readOnly value={url} onFocus={(e) => e.target.select()} />
      </label>
      <button
        className={styles.primary}
        onClick={() =>
          void navigator.clipboard
            .writeText(url)
            .then(() => {
              setCopied(true);
              setFailed(false);
            })
            .catch(() => setFailed(true))
        }
      >
        {copied ? t('Скопировано') : t('Скопировать ссылку')}
      </button>
      {failed && <p>{t('Выделите ссылку в поле и скопируйте её вручную.')}</p>}
    </section>
  );
}
