import { NavLink } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { useLocale } from '@/i18n/useLocale';
import styles from './courseNavigation.module.css';

export default function CourseNavigation() {
  const { t } = useLocale();
  const { user } = useAuth();
  const managesTeam = ['owner', 'admin', 'manager'].includes(user?.organization_role ?? '');
  return (
    <nav className={styles.tabs} aria-label={t('Материалы обучения')}>
      <NavLink to='/courses'>{t('Курсы')}</NavLink>
      <NavLink to='/templates'>{t('Шаблоны')}</NavLink>
      {managesTeam && <NavLink to='/programs'>{t('Программы')}</NavLink>}
    </nav>
  );
}
