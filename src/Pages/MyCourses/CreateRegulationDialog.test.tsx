import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CreateRegulationDialog from './CreateRegulationDialog';
import { api } from '@/shared/api';
import { readDraft, setDraftOwner } from '@/shared/drafts';
vi.mock('@/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 45 } }) }));
vi.mock('@/shared/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  setDraftOwner(45);
  vi.mocked(api.get).mockResolvedValue({
    data: { items: [{ id: 7, name: 'Администратор', revision: 3 }], total: 1 },
  });
});
afterEach(cleanup);
it('keeps a failed creation draft and opens the created regulation with its chosen position', async () => {
  vi.mocked(api.post)
    .mockRejectedValueOnce(new Error('Сеть недоступна'))
    .mockResolvedValueOnce({ data: { course_id: 9, url: '/express?course=9&step=1&position=7' } });
  render(
    <MemoryRouter>
      <Routes>
        <Route path='/' element={<CreateRegulationDialog mode='files' onClose={() => {}} />} />
        <Route path='/express' element={<h1>Загрузка документов</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('option', { name: 'Администратор' });
  fireEvent.change(screen.getByLabelText('Должность'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Название регламента'), {
    target: { value: 'Встреча гостя' },
  });
  fireEvent.change(screen.getByLabelText('Что регулирует документ'), {
    target: { value: 'Порядок встречи гостя' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Перейти к загрузке документов' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Перейти к загрузке документов' })).toBeEnabled(),
  );
  expect(readDraft<{ title: string }>('regulation-from-catalogue-files', 45)?.value.title).toBe(
    'Встреча гостя',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Перейти к загрузке документов' }));
  await screen.findByRole('heading', { name: 'Загрузка документов' });
  expect(api.post).toHaveBeenLastCalledWith('/business/positions/7/regulations', {
    title: 'Встреча гостя',
    goal: 'Порядок встречи гостя',
    language: 'ru',
    expected_position_revision: 3,
  });
  expect(readDraft('regulation-from-catalogue-files', 45)).toBeNull();
});
