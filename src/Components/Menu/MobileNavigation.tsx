import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CircleHelp, FileText, SlidersHorizontal, X } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useLocale } from '@/i18n/useLocale';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { isBusiness } from '@/shared/business';
import logo from '@/assets/figma/brand.svg';
import FigmaNavIcon, { type NavigationIcon } from './FigmaNavIcon';
import styles from './mobileNavigation.module.css';

type Item = { href: string; label: string; icon: NavigationIcon; active?: boolean };
export default function MobileNavigation({
  home,
  team,
  author,
  manager,
  owner,
  role,
  extra,
  results,
}: {
  home: string;
  team: string;
  author: boolean;
  manager: boolean;
  owner: boolean;
  role: string;
  extra: string[][];
  results?: string;
}) {
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, { active: open, onClose: () => setOpen(false) });
  useEffect(() => setOpen(false), [location.pathname, location.search, user?.id]);
  useEffect(() => {
    document.body.classList.add('has-mobile-navigation');
    return () => document.body.classList.remove('has-mobile-navigation');
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  const staff = author || manager;
  const business = isBusiness(user);
  const workspaceLinks = [
    ...(results ? [[results, t('Результаты')]] : []),
    ...extra.filter(([href]) => !owner || !['/team-settings', '/billing'].includes(href)),
  ];
  const companyOverview =
    location.pathname === '/company' &&
    (!location.search || new URLSearchParams(location.search).get('tab') === 'overview');
  const items: Item[] = [
    {
      href: home,
      label: t('Обзор'),
      icon: 'overview',
      active: home.startsWith('/company')
        ? companyOverview
        : location.pathname === home && !location.search,
    },
    {
      href: staff ? '/courses' : '/learning',
      label: t(staff ? (business ? 'Регламенты' : 'Курсы') : 'Мои курсы'),
      icon: 'courses',
      active: staff
        ? location.pathname.startsWith('/courses') || location.pathname === '/express'
        : location.pathname.startsWith('/learning/') || location.pathname === '/learning',
    },
    {
      href: staff && user?.organization_id ? team : results || '/results',
      label: t(staff && user?.organization_id ? 'Команда' : 'Результаты'),
      icon: staff && user?.organization_id ? 'team' : 'results',
      active:
        staff && user?.organization_id
          ? ['/employees', '/groups', '/assignments', '/programs', '/reviews'].includes(
              location.pathname,
            ) ||
            (location.pathname.startsWith('/company') && !companyOverview)
          : location.pathname === (results || '/results'),
    },
    {
      href: staff && user?.organization_id && results ? results : '/notifications',
      label: t(staff && user?.organization_id && results ? 'Результаты' : 'Уведомления'),
      icon: staff && user?.organization_id && results ? 'results' : 'notifications',
      active:
        location.pathname ===
        (staff && user?.organization_id && results ? results : '/notifications'),
    },
    {
      href: '/account',
      label: t('Профиль'),
      icon: 'profile',
      active: location.pathname === '/account',
    },
  ];
  const name = user?.full_name || user?.username || user?.email || t('Профиль');
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((value) => value[0])
    .join('')
    .toUpperCase();
  return (
    <>
      <button
        type='button'
        className={styles.trigger}
        aria-label={t('Открыть меню')}
        aria-expanded={open}
        aria-controls='mobile-navigation-menu'
        data-tour={staff ? 'results' : undefined}
        onClick={() => setOpen(true)}
      >
        <FigmaNavIcon name='menu' />
      </button>
      <nav className={styles.bottom} aria-label={t('Мобильная навигация')}>
        {items.map((item) => (
          <Link
            key={item.icon}
            to={item.href}
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
            data-tour={item.icon}
          >
            <FigmaNavIcon name={item.icon} />
            {item.active && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>
      {open &&
        createPortal(
          <div
            className={styles.menu}
            id='mobile-navigation-menu'
            ref={ref}
            role='dialog'
            aria-modal='true'
            aria-label={t('Меню профиля')}
            tabIndex={-1}
          >
            <header>
              <Link to={home} aria-label={t('Лерниум')}>
                <img src={logo} alt='' />
              </Link>
              <button type='button' onClick={() => setOpen(false)} aria-label={t('Закрыть меню')}>
                <X size={20} />
              </button>
            </header>
            <section className={styles.identity}>
              <div>
                <span className={styles.avatar}>{initials}</span>
                <div>
                  <strong>{name}</strong>
                  <span>{role}</span>
                </div>
              </div>
              <Link to='/account'>{t('Личный профиль')}</Link>
            </section>
            <nav className={styles.links} aria-label={t('Разделы аккаунта')}>
              {owner && (
                <Link to='/team-settings'>
                  <FigmaNavIcon name='overview' />
                  <span>{t('Организация')}</span>
                  <ArrowRight size={20} />
                </Link>
              )}
              {owner && (
                <Link to='/billing'>
                  <FigmaNavIcon name='results' />
                  <span>{t('Тариф и оплата')}</span>
                  <ArrowRight size={20} />
                </Link>
              )}
              <Link to='/account?tab=security'>
                <SlidersHorizontal size={24} />
                <span>{t('Настройки')}</span>
                <ArrowRight size={20} />
              </Link>
              {!!workspaceLinks.length && (
                <details className={styles.extra}>
                  <summary>
                    {t('Рабочие разделы')}
                    <ArrowRight size={20} />
                  </summary>
                  {workspaceLinks.map(([href, title]) => (
                    <Link key={href} to={href}>
                      <span>{title}</span>
                      <ArrowRight size={20} />
                    </Link>
                  ))}
                </details>
              )}
              <Link to='/help'>
                <CircleHelp size={24} />
                <span>{t('Помощь и поддержка')}</span>
                <ArrowRight size={20} />
              </Link>
              <a href='/legal/'>
                <FileText size={24} />
                <span>{t('Документы и политика')}</span>
                <ArrowRight size={20} />
              </a>
            </nav>
            <button
              type='button'
              className={styles.logout}
              onClick={() => {
                logout();
                navigate('/auth');
              }}
            >
              {t('Выйти из аккаунта')}
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
