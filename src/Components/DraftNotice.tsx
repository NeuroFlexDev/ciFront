import { useLocale } from '@/i18n/useLocale';
import { useSyncExternalStore } from 'react';
import { downloadDrafts, draftStorageError } from '@/shared/drafts';
import './requestState.css';
const subscribe = (listener: () => void) => {
  window.addEventListener('lernium-drafts-changed', listener);
  return () => window.removeEventListener('lernium-drafts-changed', listener);
};
export default function DraftNotice({
  restored = false,
  quiet = false,
}: {
  restored?: boolean;
  quiet?: boolean;
}) {
  const { t } = useLocale();

  const error = useSyncExternalStore(subscribe, draftStorageError, () => '');
  if (quiet && !error && !restored) return null;
  return (
    <aside
      className={`draft-notice ${error ? 'draft-notice--error' : ''}`}
      role={error ? 'alert' : 'status'}
    >
      {error
        ? t(error)
        : restored
          ? t('Восстановлен несохранённый черновик. Проверьте его и сохраните на сервере.')
          : t(
              'Изменения сохраняются в черновик на этом устройстве. Для публикации сохраните их на сервере.',
            )}
      <button type='button' onClick={downloadDrafts}>
        {t('Скачать копию черновиков')}
      </button>
    </aside>
  );
}
