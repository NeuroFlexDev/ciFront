import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import s from './adminFeedback.module.css';

export default function AdminToast({ message, onClose }: { message: string; onClose: () => void }) {
  const { t } = useLocale();
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!message || paused) return;
    const timer = window.setTimeout(onClose, 7000);
    return () => window.clearTimeout(timer);
  }, [message, paused, onClose]);
  if (!message) return null;
  return createPortal(
    <div
      className={s.toast}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <CheckCircle2 size={21} aria-hidden='true' />
      <span role='status'>{message}</span>
      <button onClick={onClose} aria-label={t('Закрыть уведомление')}>
        <X size={18} />
      </button>
    </div>,
    document.body,
  );
}
