import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import styles from './styles.module.css';

/** Non-modal overlay: the board stays mounted and usable behind each panel. */
export function CanvasPanel({
  id,
  title,
  open,
  side,
  onClose,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  side: 'left' | 'right';
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useLocale();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
  }, [open]);
  return (
    <section
      id={id}
      hidden={!open}
      data-canvas-panel
      className={styles.floatingPanel}
      data-side={side}
      aria-labelledby={`${id}-title`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className={styles.panelHeader}>
        <h2 id={`${id}-title`}>{title}</h2>
        <button
          ref={closeRef}
          type='button'
          className={styles.iconButton}
          onClick={onClose}
          aria-label={`${t('Закрыть')}: ${title}`}
        >
          <X size={18} aria-hidden='true' />
        </button>
      </header>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}
