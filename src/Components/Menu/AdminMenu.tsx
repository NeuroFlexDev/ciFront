import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useLocale } from '@/i18n/useLocale';
import LanguageSwitch from '@/Components/LanguageSwitch';
import logo from '@/assets/figma/brand.svg';
import bell from '@/assets/figma/notification.svg';
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
      </Link>
      <nav className={styles.navigation} aria-label={t('Управление платформой')}>
        {[
          [
            '/admin',
            'Заказчики',
            (location.pathname === '/admin' &&
              new URLSearchParams(location.search).get('tab') !== 'audit') ||
              location.pathname.startsWith('/admin/organizations/'),
          ],
          [
            '/admin/operations',
            'Мониторинг',
            ['/admin/operations', '/admin/ai', '/support-access'].includes(location.pathname),
          ],
          [
            '/admin?tab=audit',
            'Журнал',
            location.pathname === '/admin' &&
              new URLSearchParams(location.search).get('tab') === 'audit',
          ],
        ].map(([path, label, active]) => (
          <Link
            key={String(path)}
            to={String(path)}
            aria-current={active ? 'page' : undefined}
            className={`${styles.link} ${active ? styles.active : ''}`}
          >
            {t(String(label))}
          </Link>
        ))}
      </nav>
      <Link className={styles.bell} to='/admin/operations' aria-label={t('Генерации и сбои')}>
        <img src={bell} alt='' />
      </Link>
      <details ref={account} className={styles.account}>
        <summary aria-label={t('Меню аккаунта')}>
          <span className={styles.identity}>
            <span>{user?.full_name || t('Администратор')}</span>
            <small>{t('Оператор Лерниума')}</small>
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
