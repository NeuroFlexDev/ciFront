import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  Activity,
  Sparkles,
  LifeBuoy,
  ChevronDown,
  LogOut,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useLocale } from '@/i18n/useLocale';
import LanguageSwitch from '@/Components/LanguageSwitch';
import logo from '@/assets/icons/logo.svg';
import styles from './adminMenu.module.css';
export default function AdminMenu() {
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const account = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (account.current) account.current.open = false;
  }, [location.pathname, location.search]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (account.current && !account.current.contains(event.target as Node))
        account.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && account.current?.open) {
        account.current.open = false;
        account.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  return (
    <header className={styles.header}>
      <Link className={styles.brand} to='/admin'>
        <img src={logo} alt={t('Лерниум')} />
        <span>{t('Управление')}</span>
      </Link>
      <nav className={styles.navigation} aria-label={t('Управление платформой')}>
        {(
          [
            ['/admin', 'Заказчики и доступ', Building2],
            ['/admin/ai', 'AI-провайдеры', Sparkles],
            ['/admin/operations', 'Состояние сервисов', Activity],
            ['/support-access', 'Доступ поддержки', LifeBuoy],
          ] as const
        ).map(([path, label, Icon]) => (
          <NavLink
            key={path}
            to={path}
            end
            className={({ isActive }) =>
              `${styles.link} ${isActive || (path === '/admin' && location.pathname.startsWith('/admin/organizations/')) ? styles.active : ''}`
            }
          >
            <Icon size={17} />
            {t(label)}
          </NavLink>
        ))}
      </nav>
      <details ref={account} className={styles.account}>
        <summary aria-label={t('Меню аккаунта')}>
          <span className={styles.avatar}>
            {(user?.full_name || user?.email || 'A').slice(0, 1).toUpperCase()}
          </span>
          <ChevronDown size={15} />
        </summary>
        <div className={styles.dropdown}>
          <strong>{user?.full_name || t('Администратор')}</strong>
          <small>{user?.email}</small>
          <Link to='/account'>
            <UserRound size={16} />
            {t('Профиль и безопасность')}
          </Link>
          <LanguageSwitch />
          <button
            onClick={() => {
              logout();
              navigate('/auth', { replace: true });
            }}
          >
            <LogOut size={16} />
            {t('Выйти из аккаунта ↗')}
          </button>
        </div>
      </details>
    </header>
  );
}
