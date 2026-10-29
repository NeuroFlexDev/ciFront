import { useAuth } from '@/auth/useAuth';
import { Shell } from './shared';
import { NotificationUpdates } from '@/Components/Menu/NotificationMenu';
import { useLearningData } from '../Learning/useLearningData';
import { useLocale } from '@/i18n/useLocale';
import styles from '@/Components/Menu/notifications.module.css';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const permissions = useLearningData<{ can_author: boolean }>('/team/permissions');
  return (
    <Shell title={t('Уведомления')} className={styles.fullPage}>
      <section className={styles.fullCenter} aria-label={t('Центр уведомлений')}>
        <NotificationUpdates
          key={`${user?.id}:${user?.organization_id}`}
          author={permissions.data?.can_author ?? false}
          close={() => {}}
        />
      </section>
    </Shell>
  );
}
