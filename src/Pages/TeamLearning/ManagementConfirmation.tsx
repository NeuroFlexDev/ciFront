import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useLocale } from '@/i18n/useLocale';
import s from './managementConfirmation.module.css';

export type Confirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  action: () => unknown | Promise<unknown>;
};

export default function ConfirmationDialog({ confirmation, onClose }: { confirmation: Confirmation; onClose: () => void }) {
  const { t } = useLocale();
  const titleId = useId(), descriptionId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  useDialogFocus(dialog, { busy, onClose });
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  async function accept() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      // Existing useTeamAction owns the request, error state and recovery.
      await confirmation.action();
    } finally {
      if (mounted.current) onClose();
    }
  }
  return createPortal(
    <div className={s.backdrop}>
      <div ref={dialog} className={s.dialog} role="alertdialog" aria-modal="true"
        aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={busy} tabIndex={-1}>
        <span className={s.eyebrow}>{t('Подтверждение действия')}</span>
        <h2 id={titleId}>{confirmation.title}</h2>
        <p id={descriptionId}>{confirmation.description}</p>
        <div className={s.actions}>
          <button type="button" className={s.cancel} disabled={busy} onClick={onClose}>{t('Отмена')}</button>
          <button type="button" className={s.confirm} disabled={busy} onClick={() => void accept()}>
            {busy ? t('Выполняем действие…') : confirmation.confirmLabel}
          </button>
        </div>
      </div>
    </div>, document.body,
  );
}
