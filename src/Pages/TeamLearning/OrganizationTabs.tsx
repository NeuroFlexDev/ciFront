import { Link, useLocation } from 'react-router-dom';
import { useLocale } from '@/i18n/useLocale';
import { useAuth } from '@/auth/useAuth';
import s from '../Learning/learning.module.css';
export default function OrganizationTabs() {
  const { t } = useLocale();
  const { user } = useAuth();
  const location = useLocation();
  const current =
    location.pathname === '/billing'
      ? 'billing'
      : location.pathname === '/integrations'
        ? 'integrations'
        : new URLSearchParams(location.search).get('tab') || 'general';
  return (
    <nav className={s.organizationTabs} aria-label={t('Настройки организации')}>
      {[
        ['general', '/team-settings', 'Основное'],
        ['rules', '/team-settings?tab=rules', 'Правила обучения'],
        ...(user?.organization_role === 'owner' ? [['billing', '/billing', 'Тариф и лимиты']] : []),
        ['integrations', '/integrations', 'Интеграции'],
        ['audit', '/team-settings?tab=audit', 'Журнал действий'],
      ].map(([id, to, label]) => (
        <Link key={id} to={to} aria-current={current === id ? 'page' : undefined}>
          {t(label)}
        </Link>
      ))}
    </nav>
  );
}
