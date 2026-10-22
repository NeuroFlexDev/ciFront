import { useLocale } from '@/i18n/useLocale';
import { ApiError } from '@/shared/errors';
import { RequestError } from '@/Components/RequestState';
import type { useManagementCapability } from './useManagementCapability';
import s from '../Learning/learning.module.css';

export function ManagementCapabilityNotice({ capability }: { capability: ReturnType<typeof useManagementCapability> }) {
  const { t } = useLocale();
  if (capability.supported) return null;
  if (capability.error && !(capability.error instanceof ApiError && capability.error.status === 404))
    return <RequestError error={capability.error} onRetry={() => void capability.reload()} />;
  return <div className={s.muted} role="status"><p>{t(capability.loading
    ? 'Проверяем поддержку управления записями…'
    : 'Сервер ещё не поддерживает безопасное изменение и восстановление записей. Дождитесь обновления сервера. Ваши черновики сохранены.')}</p>
    {!capability.loading && <button type="button" className={s.secondary} onClick={() => void capability.reload()}>{t('Проверить поддержку снова')}</button>}
  </div>;
}
