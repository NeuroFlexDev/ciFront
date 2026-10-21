import { useRoleNames } from '@/Pages/TeamLearning/useRoleNames';
import { useLocale } from '@/i18n/useLocale';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { api } from '@/shared/api';
import logo from '@/assets/icons/logo.svg';
import styles from './styles.module.css';
type Permissions = {
  can_manage_team: boolean;
  can_author: boolean;
  can_review: boolean;
  can_report: boolean;
};
export default function Menu() {
  const { t, locale, setLocale } = useLocale();
  const roleName = useRoleNames();

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const accountRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (accountRef.current) accountRef.current.open = false;
  }, [location.pathname]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node))
        accountRef.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && accountRef.current?.open) {
        accountRef.current.open = false;
        accountRef.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    api
      .get<Permissions>('/team/permissions')
      .then(({ data }) => {
        if (active) {
          setPermissions(data);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [user?.id, version]);
  const author = permissions?.can_author ?? !user?.organization_id;
  const links = [
    ['/dashboard', t('Дашборд')],
    ['/learning', t('Моё обучение')],
    ...(author
      ? [
          ['/courses', t('Курсы')],
          ['/express', t('Создать курс')],
        ]
      : []),
    ...(user?.organization_id ? [['/employees', t('Сотрудники')]] : []),
    ...(permissions?.can_report
      ? [['/learning-analytics', t('Аналитика')]]
      : author
        ? [['/analytics', t('Аналитика')]]
        : []),
  ];
  const extra = [
    ...(author
      ? [
          ['/templates', t('Сценарии')],
          ['/ai-helper', t('ИИ-помощник')],
        ]
      : []),
    ...(permissions?.can_review
      ? [
          ['/reviews', t('Проверка работ')],
          ['/course-reviews', t('Согласование курсов')],
        ]
      : []),
    ...(permissions?.can_manage_team
      ? [
          ['/groups', t('Группы и подразделения')],
          ['/assignments', t('Назначения')],
          ['/programs', t('Программы')],
          ['/team-settings', t('Настройки организации')],
        ]
      : []),
    ...(permissions?.can_manage_team ? [['/integrations', t('Интеграции')]] : []),
    ...(user?.organization_role === 'owner' ? [['/billing', t('Договор и оплата')]] : []),
    ...(user?.is_admin ? [['/admin', t('Управление платформой')]] : []),
    ...(user?.is_admin || user?.organization_role === 'owner'
      ? [['/support-access', t('Доступ поддержки')]]
      : []),
  ];
  return (
    <header className={styles.menuContainer}>
      <Link className={styles.brand} to='/dashboard'>
        <img src={logo} alt={t('Лерниум')} />
      </Link>
      <nav className={styles.navigationContainer} aria-label={t('Разделы платформы')}>
        {links.map(([path, title]) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `${styles.navText} ${isActive ? styles.active : ''}`}
          >
            {title}
          </NavLink>
        ))}
      </nav>
      <details ref={accountRef} className={styles.accountBlock}>
        <summary>
          <span className={styles.userInfo}>
            <span className={styles.userName}>
              {user?.full_name || user?.email || t('Профиль')}
            </span>
            <span className={styles.userRole}>
              {user?.is_admin
                ? t('Оператор платформы')
                : user?.organization_id
                  ? roleName(user.organization_role ?? 'member')
                  : t('Личный профиль')}
            </span>
          </span>
          <svg
            className={styles.chevron}
            width='20'
            height='20'
            viewBox='0 0 20 20'
            fill='none'
            aria-hidden='true'
          >
            <path
              d='m4 7 6 6 6-6'
              stroke='currentColor'
              strokeWidth='1.7'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </summary>
        <nav className={styles.dropdown} aria-label={t('Профиль и дополнительные разделы')}>
          <Link to='/account'>{t('Профиль и безопасность')}</Link>
          {extra.map(([path, title]) => (
            <NavLink key={path} to={path}>
              {title}
            </NavLink>
          ))}
          {failed && (
            <button
              onClick={() => {
                setFailed(false);
                setVersion((value) => value + 1);
              }}
            >
              {t('Повторить загрузку доступных разделов')}
            </button>
          )}
          <label className={styles.localeField}>
            {t('Язык интерфейса')}
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value === 'en' ? 'en' : 'ru')}
            >
              <option value='ru'>Русский</option>
              <option value='en'>English</option>
            </select>
          </label>
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
