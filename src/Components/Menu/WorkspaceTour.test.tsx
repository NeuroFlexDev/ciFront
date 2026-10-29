import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import WorkspaceTour from './WorkspaceTour';

vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 9, organization_id: 2, organization_kind: 'business', organization_role: 'owner' },
  }),
}));
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

it('waits for an explicit first login and available permissions', () => {
  const view = render(<WorkspaceTour ready={false} owner staff />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  sessionStorage.setItem('lernium:welcome:9', '1');
  view.rerender(<WorkspaceTour ready owner staff />);
  expect(screen.getByRole('dialog', { name: 'Начните с команды' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
  expect(screen.getByText('Шаг 2 из 4')).toBeVisible();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(localStorage.getItem('lernium:tour:v1:9:2:owner')).toBe('done');
  expect(sessionStorage.getItem('lernium:welcome:9')).toBeNull();
});

it('can be reopened from Help after completion', () => {
  localStorage.setItem('lernium:tour:v1:9:2:owner', 'done');
  render(<WorkspaceTour ready owner staff />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent(window, new Event('lernium-tour-start'));
  expect(screen.getByRole('dialog', { name: 'Начните с команды' })).toBeVisible();
});
