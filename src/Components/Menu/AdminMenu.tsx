import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { useLocale } from '@/i18n/useLocale';
import LanguageSwitch from '@/Components/LanguageSwitch';
import logo from '@/assets/icons/logo.svg';
import styles from './styles.module.css';
export default function AdminMenu() {
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  return (
    <header className={styles.menuContainer}>
      <Link className={styles.brand} to='/admin'>
        <img src={logo} alt={t('Лерниум')} />
      </Link>
      <nav className={styles.navigationContainer} aria-label={t('Управление платформой')}>
        {[
          ['/admin', 'Заказчики и доступ'],
          ['/admin/operations', 'Состояние сервисов'],
          ['/support-access', 'Доступ поддержки'],
        ].map(([path, label]) => (
          <NavLink
            key={path}
            to={path}
            end
            className={({ isActive }) => `${styles.navText} ${isActive ? styles.active : ''}`}
          >
            {t(label)}
          </NavLink>
        ))}
      </nav>
      <details className={styles.accountBlock}>
        <summary>{user?.full_name || user?.email}</summary>
        <nav className={styles.dropdown}>
          <Link to='/account'>{t('Профиль и безопасность')}</Link>
          <LanguageSwitch />
          <button
            onClick={() => {
              logout();
              navigate('/auth', { replace: true });
            }}
          >
            {t('Выйти из аккаунта ↗')}
          </button>
        </nav>
      </details>
    </header>
  );
}
