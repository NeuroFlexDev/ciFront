import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { useLocale } from '@/i18n/useLocale';
import type AdminDialog from './AdminDialog';
import s from './adminFeedback.module.css';

export default function AdminInlinePanel({
  title,
  description,
  children,
  onClose,
  busy = false,
  guard = false,
  className = '',
}: ComponentProps<typeof AdminDialog>) {
  const { t } = useLocale();
  const [dirty, setDirty] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  const close = () => {
    if (busy) return;
    if (guard && dirty) setConfirm(true);
    else onClose();
  };
  useEffect(() => {
    if (!dirty || !guard) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [dirty, guard]);
  useEffect(() => {
    if (!busy && (!dirty || !guard)) return;
    const protect = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest('a[href]');
      if (link && !panel.current?.contains(link)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!busy) setConfirm(true);
      }
    };
    document.addEventListener('click', protect, true);
    return () => document.removeEventListener('click', protect, true);
  }, [dirty, guard, busy]);
  return (
    <section
      ref={panel}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          close();
        }
      }}
      className={`${s.inlinePanel} ${className}`}
      aria-label={title}
      aria-busy={busy}
      onChangeCapture={() => setDirty(true)}
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest('[data-dialog-close]')) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <header className={s.inlineHeader}>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button type='button' aria-label={t('Закрыть панель')} disabled={busy} onClick={close}>
          ×
        </button>
      </header>
      {confirm && (
        <div className={s.discard} role='alert'>
          <p>{t('Закрыть без сохранения? Изменения в этой форме будут потеряны.')}</p>
          <button type='button' onClick={() => setConfirm(false)}>
            {t('Продолжить редактирование')}
          </button>
          <button type='button' onClick={onClose}>
            {t('Закрыть без сохранения')}
          </button>
        </div>
      )}
      {children}
    </section>
  );
}
