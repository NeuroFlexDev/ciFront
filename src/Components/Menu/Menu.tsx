import { isAdminSurface, adminAppUrl } from '@/shared/surface';
import AdminMenu from './AdminMenu';
import NotificationMenu from './NotificationMenu';
import MobileNavigation from './MobileNavigation';
import WorkspaceTour from './WorkspaceTour';
import { isBusiness, isBusinessManager, businessHome } from '@/shared/business';
import { useRoleNames } from '@/Pages/TeamLearning/useRoleNames';
import { useLocale } from '@/i18n/useLocale';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { api, getAuthToken } from '@/shared/api';
import { useReconnect } from '@/hooks/useReconnect';
import logo from '@/assets/figma/brand.svg';
import styles from './styles.module.css';
type Permissions = {
  can_manage_team: boolean;
  can_manage_business?: boolean;
  can_author: boolean;
  can_review: boolean;
  can_report: boolean;
};
// Retain the menu between routed pages; the API still checks every operation.
// A different session never inherits a previous account's navigation cache.
let navigationCache: { userId: number; token: string; at: number; value: Permissions } | null =
  null;
export default function Menu() {
  return isAdminSurface ? <AdminMenu /> : <PlatformMenu />;
}
function PlatformMenu() {
  const { t, locale, setLocale } = useLocale();
  const roleName = useRoleNames();

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const accountRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (accountRef.current) accountRef.current.open = false;
  }, [location.pathname, location.search]);
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
  const [permissions, setPermissions] = useState<Permissions | null>(() =>
    navigationCache?.userId === user?.id &&
    navigationCache?.token === getAuthToken() &&
    Date.now() - navigationCache.at < 60_000
      ? navigationCache.value
      : null,
  );
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  useReconnect(() => setVersion((value) => value + 1));
  useEffect(() => {
    let active = true;
    const token = getAuthToken();
    api
      .get<Permissions>('/team/permissions')
      .then(({ data }) => {
        if (active && token === getAuthToken()) {
          if (user?.id && token)
            navigationCache = { userId: user.id, token, at: Date.now(), value: data };
          setPermissions(data);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) {
          navigationCache = null;
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [user?.id, version]);
  const author = permissions?.can_author ?? !user?.organization_id;
  const business = isBusiness(user);
  const manager = isBusinessManager(user);
  const companyOverview =
    location.pathname === '/company' &&
    (new URLSearchParams(location.search).get('tab') === 'overview' || !location.search);
  const companyPersonnel = location.pathname.startsWith('/company') && !companyOverview;
  const learner = !author && ['member', 'candidate'].includes(user?.organization_role ?? '');
  const links = manager
    ? [
        ['/company?tab=overview', t('Обзор')],
        ['/company?tab=employees', t('Команда')],
        ['/courses', t('Регламенты')],
        ...(permissions?.can_report ? [['/learning-analytics', t('Результаты')]] : []),
      ]
    : business
      ? [
          ...(author
            ? [
                ['/dashboard', t('Обзор')],
                ['/employees', t('Команда')],
                ['/courses', t('Регламенты')],
                ...(permissions?.can_report ? [['/learning-analytics', t('Результаты')]] : []),
              ]
            : [
                ['/learning', t('Обучение')],
                ['/results', t('Результаты')],
              ]),
        ]
      : learner
        ? [
            ['/learning', t('Моё обучение')],
            ['/results', t('Результаты')],
          ]
        : [
            ['/dashboard', t('Дашборд')],
            ...(permissions?.can_manage_business ? [['/company', t('Моя компания')]] : []),
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
    ...(!business && !learner ? [['/learning', t('Моё обучение')]] : []),
    ...(manager ? [['/learning', t('Мои регламенты')]] : []),
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

    ...(user?.organization_role === 'owner' ? [['/support-access', t('Доступ поддержки')]] : []),
  ];
  return (
    <header className={`${styles.menuContainer} ${business ? styles.businessMenu : ''}`}>
      <Link className={styles.brand} to={businessHome(user, '/dashboard')}>
        <img src={logo} alt={t('Лерниум')} />
      </Link>
      <nav className={styles.navigationContainer} aria-label={t('Разделы платформы')}>
        {links.map(([path, title]) => (
          <NavLink
            key={path}
            to={path}
            data-tour={
              path.includes('overview') || path === '/dashboard'
                ? 'overview'
                : path.startsWith('/company') || path === '/employees'
                  ? 'team'
                  : path === '/courses' || path === '/learning'
                    ? 'courses'
                    : 'results'
            }
            aria-current={
              path.startsWith('/company')
                ? (path.includes('overview') ? companyOverview : companyPersonnel)
                  ? 'page'
                  : false
                : undefined
            }
            className={({ isActive }) =>
              `${styles.navText} ${(path.startsWith('/company') ? (path.includes('overview') ? companyOverview : companyPersonnel) : isActive) ? styles.active : ''}`
            }
          >
            {title}
          </NavLink>
        ))}
      </nav>
      <div className={styles.desktopNotification}>
        <NotificationMenu author={author} />
      </div>
      <details ref={accountRef} className={styles.accountBlock}>
        <summary data-tour='profile'>
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
          <div className={styles.profileIdentity}>
            <span>
              {(user?.full_name || user?.username || user?.email || 'Л')
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()}
            </span>
            <div>
              <strong>{user?.full_name || user?.username || t('Профиль')}</strong>
              {user?.email && <small>{user.email}</small>}
              <small className={styles.userRole}>
                {roleName(user?.organization_role ?? 'member')}
              </small>
            </div>
          </div>
          <Link to='/account'>{t('Личный профиль')}</Link>
          {user?.is_admin && <a href={`${adminAppUrl}/admin`}>{t('Управление платформой')} ↗</a>}
          {user?.organization_role === 'owner' && (
            <>
              <Link to='/team-settings'>{t('Организация')}</Link>
              <Link to='/billing'>{t('Тариф и оплата')}</Link>
            </>
          )}
          {extra.some(
            ([path]) =>
              user?.organization_role !== 'owner' || !['/team-settings', '/billing'].includes(path),
          ) && (
            <details className={styles.workSections}>
              <summary>
                {t('Рабочие разделы')}
                <span aria-hidden='true'>⌄</span>
              </summary>
              <div>
                {extra
                  .filter(
                    ([path]) =>
                      user?.organization_role !== 'owner' ||
                      !['/team-settings', '/billing'].includes(path),
                  )
                  .map(([path, title]) => (
                    <NavLink key={path} to={path}>
                      {title}
                    </NavLink>
                  ))}
              </div>
            </details>
          )}
          <Link to='/help'>{t('Помощь и поддержка')}</Link>
          <a href='/legal/'>{t('Документы и политика')}</a>
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
      <MobileNavigation
        home={
          manager
            ? '/company?tab=overview'
            : learner || (business && !author)
              ? '/learning'
              : '/dashboard'
        }
        team={manager ? '/company?tab=employees' : '/employees'}
        author={author}
        manager={manager}
        owner={user?.organization_role === 'owner'}
        role={roleName(user?.organization_role ?? 'member')}
        extra={extra}
        results={
          permissions?.can_report ? '/learning-analytics' : author ? '/analytics' : undefined
        }
      />
      <WorkspaceTour
        ready={!!permissions}
        owner={user?.organization_role === 'owner'}
        staff={manager || author}
      />
    </header>
  );
}
