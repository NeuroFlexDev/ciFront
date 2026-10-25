import { Link } from 'react-router-dom';
import { useLocale } from '@/i18n/useLocale';
import { useResource } from './useResource';
import { ResourceState } from './IntegrationComponents';
import s from './integrations.module.css';
type Connection = { enabled?: boolean; revoked_at?: string | null; expires_at?: string };
function ConnectionCard({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  const { t } = useLocale();
  const resource = useResource<{ items: Connection[] }>(`/integrations/${id}`);
  const active = resource.data?.items.filter((item) =>
    id === 'keys'
      ? !item.revoked_at &&
        !!item.expires_at &&
        Date.parse(
          item.expires_at.endsWith('Z') || /[+-]\d\d:\d\d$/.test(item.expires_at)
            ? item.expires_at
            : item.expires_at + 'Z',
        ) > Date.now()
      : item.enabled,
  ).length;
  return (
    <section className={s.connectionCard}>
      <div className={s.row}>
        <h2>{t(title)}</h2>
        {resource.data && (
          <span className={s.status} data-state={active ? 'active' : 'pending'}>
            {t(active ? 'Подключено' : 'Не настроено')}
          </span>
        )}
      </div>
      <p>{t(description)}</p>
      <ResourceState {...resource} />
      {resource.data && (
        <p className={s.muted}>{t('Активных подключений: {count}', { count: active ?? 0 })}</p>
      )}
      <div className={s.row}>
        <Link className={s.primary} to={`/integrations?tab=${id}`}>
          {t('Настроить')}
        </Link>
        <Link className={s.secondary} to='/integrations?tab=deliveries'>
          {t('Журнал доставки')}
        </Link>
      </div>
    </section>
  );
}
export default function IntegrationOverview() {
  return (
    <div className={s.connectionGrid}>
      <ConnectionCard
        id='keys'
        title='API'
        description='Обмен данными с вашими системами: участники, назначения, результаты.'
      />
      <ConnectionCard
        id='oidc'
        title='Единый вход (SSO)'
        description='Вход сотрудников через корпоративную учётную запись.'
      />
      <ConnectionCard
        id='lti'
        title='LMS'
        description='Запуск курсов Лерниума из вашей LMS и передача результатов.'
      />
      <ConnectionCard
        id='webhooks'
        title='Webhooks'
        description='Отправка событий обучения в подключённые приложения.'
      />
    </div>
  );
}
