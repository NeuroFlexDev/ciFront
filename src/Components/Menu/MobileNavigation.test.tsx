import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import MobileNavigation from './MobileNavigation';

const session = vi.hoisted(() => ({
  user: {
    id: 9,
    full_name: 'Мария Соколова',
    organization_id: 2 as number | null,
    organization_kind: 'business',
  },
}));
vi.mock('@/auth/useAuth', () => ({ useAuth: () => ({ user: session.user, logout: vi.fn() }) }));
beforeEach(() => {
  session.user.organization_id = 2;
  session.user.organization_kind = 'business';
});
afterEach(cleanup);

it('keeps a learner overview distinct from the regulation catalogue', () => {
  render(
    <MemoryRouter initialEntries={['/learning']}>
      <MobileNavigation
        home='/dashboard'
        team='/employees'
        author={false}
        manager={false}
        owner={false}
        role='Сотрудник'
        results='/results'
        extra={[]}
      />
    </MemoryRouter>,
  );
  const nav = within(screen.getByRole('navigation', { name: 'Мобильная навигация' }));
  expect(nav.getByRole('link', { name: 'Обзор' })).toHaveAttribute('href', '/dashboard');
  const catalogue = nav
    .getAllByRole('link')
    .find((link) => link.getAttribute('href') === '/learning');
  expect(catalogue).toHaveAttribute('aria-current', 'page');
  expect(nav.getByRole('link', { name: 'Обзор' })).not.toHaveAttribute('aria-current');
});

it('keeps authorized team settings and results reachable for a manager on mobile', () => {
  render(
    <MemoryRouter>
      <MobileNavigation
        home='/company?tab=overview'
        team='/company?tab=employees'
        author
        manager
        owner={false}
        role='Руководитель'
        results='/learning-analytics'
        extra={[
          ['/team-settings', 'Настройки организации'],
          ['/reviews', 'Проверка работ'],
        ]}
      />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Открыть меню' }));
  const menu = screen.getByRole('dialog', { name: 'Меню профиля' });
  fireEvent.click(within(menu).getByText('Рабочие разделы'));
  expect(within(menu).getByRole('link', { name: 'Настройки организации' })).toHaveAttribute(
    'href',
    '/team-settings',
  );
  expect(within(menu).getByRole('link', { name: 'Результаты' })).toHaveAttribute(
    'href',
    '/learning-analytics',
  );
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('uses course terminology and analytics instead of a team link for a personal author', () => {
  session.user.organization_id = null;
  session.user.organization_kind = 'personal';
  render(
    <MemoryRouter>
      <MobileNavigation
        home='/dashboard'
        team='/employees'
        author
        manager={false}
        owner={false}
        role='Автор'
        results='/analytics'
        extra={[]}
      />
    </MemoryRouter>,
  );
  const navigation = screen.getByRole('navigation', { name: 'Мобильная навигация' });
  expect(within(navigation).getByRole('link', { name: 'Курсы' })).toHaveAttribute(
    'href',
    '/courses',
  );
  expect(within(navigation).getByRole('link', { name: 'Результаты' })).toHaveAttribute(
    'href',
    '/analytics',
  );
  expect(within(navigation).queryByRole('link', { name: 'Команда' })).not.toBeInTheDocument();
});
