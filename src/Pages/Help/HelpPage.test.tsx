import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { api } from '@/shared/api';
import { setDraftOwner } from '@/shared/drafts';
import HelpPage from './HelpPage';

vi.mock('@/shared/api', () => ({ api: { post: vi.fn() } }));
vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 5, full_name: 'Анна', email: 'anna@example.test', organization_kind: 'business' },
  }),
}));
vi.mock('@/Pages/Workspace/shared', () => ({
  styles: {},
  Shell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setDraftOwner(5);
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
  setDraftOwner(null);
});

it('preserves a support request after failure and clears it only after the server accepts it', async () => {
  vi.mocked(api.post)
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce({ data: { reference: 'request-42' } });
  render(
    <MemoryRouter>
      <HelpPage />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Написать в поддержку' }));
  let dialog = within(screen.getByRole('dialog'));
  fireEvent.change(dialog.getByLabelText('Тема'), { target: { value: 'Не открывается задание' } });
  fireEvent.change(dialog.getByLabelText('Описание'), {
    target: { value: 'В регламенте по сервису не открывается второе задание.' },
  });
  fireEvent.click(dialog.getByRole('button', { name: 'Отправить' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(dialog.getByRole('button', { name: 'Отправить' })).toBeEnabled());
  expect(dialog.getByLabelText('Тема')).toHaveValue('Не открывается задание');
  fireEvent.click(dialog.getByRole('button', { name: 'Отправить' }));
  expect(await screen.findByText('request-42')).toBeVisible();
  expect(api.post).toHaveBeenLastCalledWith(
    '/legal/requests',
    expect.objectContaining({ purpose: 'support', email: 'anna@example.test', consent: false }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Написать в поддержку' }));
  dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByLabelText('Тема')).toHaveValue('');
  expect(dialog.getByLabelText('Описание')).toHaveValue('');
});
