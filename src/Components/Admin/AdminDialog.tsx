import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useLocale } from '@/i18n/useLocale';
import s from './adminFeedback.module.css';

export default function AdminDialog({
  title,
  description,
  children,
  onClose,
  busy = false,
  guard = false,
  className = '',
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  guard?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const titleId = useId(),
    descriptionId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  function close() {
    if (busy) return;
    if (guard && dirty) setConfirmClose(true);
    else onClose();
  }
  useDialogFocus(ref, { busy, onClose: close });
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return createPortal(
    <div
      className={s.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        className={`${s.dialog} ${className}`}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={busy}
        tabIndex={-1}
      >
        <header className={s.header}>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button
            className={s.close}
            type='button'
            aria-label={t('Закрыть окно')}
            disabled={busy}
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        {confirmClose && (
          <div className={s.discard} role='alert'>
            <p>{t('Закрыть без сохранения? Изменения в этой форме будут потеряны.')}</p>
            <button type='button' onClick={() => setConfirmClose(false)}>
              {t('Продолжить редактирование')}
            </button>
            <button type='button' onClick={onClose}>
              {t('Закрыть без сохранения')}
            </button>
          </div>
        )}
        <fieldset
          className={s.body}
          disabled={busy}
          onChangeCapture={() => setDirty(true)}
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest('[data-dialog-close]')) {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
          }}
        >
          {children}
        </fieldset>
      </div>
    </div>,
    document.body,
  );
}
