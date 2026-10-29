import { FormEvent, useState } from 'react';
import { useLocale } from '@/i18n/useLocale';
import { useLearningData } from '@/Pages/Learning/useLearningData';
import { LoadingState, RequestError } from '@/Components/RequestState';
import { api } from '@/shared/api';
import styles from './styles.module.css';

type Preferences = {
  push_enabled: boolean;
  assignment_enabled: boolean;
  deadline_enabled: boolean;
  result_enabled: boolean;
  review_enabled: boolean;
  generation_enabled: boolean;
  quiet_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
  timezone: string;
};
const labels = {
  push_enabled: 'Push на устройствах',
  assignment_enabled: 'Новое обучение',
  deadline_enabled: 'Приближение срока',
  result_enabled: 'Результаты проверки',
  review_enabled: 'Ответы на проверку',
  generation_enabled: 'Готовность генерации',
  quiet_enabled: 'Тихие часы',
} as const;

export default function NotificationPreferences() {
  const { t } = useLocale();
  const resource = useLearningData<Preferences>('/notifications/preferences');
  const [edited, setEdited] = useState<Preferences | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [saved, setSaved] = useState(false);
  const form = edited || resource.data;
  function edit(patch: Partial<Preferences>) {
    if (form) {
      setEdited({ ...form, ...patch });
      setSaved(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form || busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const { data } = await api.put<Preferences>('/notifications/preferences', form);
      setEdited(data);
      setSaved(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.card} aria-label={t('Уведомления об обучении')}>
      <h2>{t('Уведомления об обучении')}</h2>
      <p>
        {t(
          'Эти настройки действуют на всех ваших устройствах. История в центре уведомлений сохраняется, даже когда push выключены.',
        )}
      </p>
      {resource.loading && !form && <LoadingState />}
      {!!(resource.error || error) && (
        <RequestError error={resource.error || error} onRetry={() => void resource.reload()} />
      )}
      {form && (
        <form onSubmit={(event) => void save(event)}>
          {Object.entries(labels).map(([key, label]) => (
            <label className={styles.checkbox} key={key}>
              <input
                type='checkbox'
                disabled={busy}
                checked={form[key as keyof typeof labels]}
                onChange={(event) => edit({ [key]: event.target.checked })}
              />
              <span>{t(label)}</span>
            </label>
          ))}
          {form.quiet_enabled && (
            <>
              <label>
                {t('Не беспокоить с')}
                <input
                  type='time'
                  required
                  disabled={busy}
                  value={form.quiet_start}
                  onChange={(event) => edit({ quiet_start: event.target.value })}
                />
              </label>
              <label>
                {t('До')}
                <input
                  type='time'
                  required
                  disabled={busy}
                  value={form.quiet_end}
                  onChange={(event) => edit({ quiet_end: event.target.value })}
                />
              </label>
            </>
          )}
          <label>
            {t('Часовой пояс')}
            <input
              required
              maxLength={64}
              disabled={busy}
              value={form.timezone}
              placeholder='Europe/Moscow'
              onChange={(event) => edit({ timezone: event.target.value })}
            />
          </label>
          <p className={styles.muted}>
            {t(
              'В тихие часы push откладываются до указанного времени. Для доставки разрешите уведомления в мобильном приложении Lernium.',
            )}
          </p>
          <button className={styles.primary} disabled={busy}>
            {t(busy ? 'Сохраняем…' : 'Сохранить уведомления')}
          </button>
        </form>
      )}
      {saved && (
        <p className={styles.success} role='status'>
          {t('Настройки сохранены на всех устройствах.')}
        </p>
      )}
    </section>
  );
}
