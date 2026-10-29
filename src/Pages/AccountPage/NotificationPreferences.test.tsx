import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { api } from '@/shared/api';
import NotificationPreferences from './NotificationPreferences';
vi.mock('@/shared/api', () => ({ api: { get: vi.fn(), put: vi.fn() } }));
const preferences = {
  push_enabled: true,
  assignment_enabled: true,
  deadline_enabled: true,
  result_enabled: true,
  review_enabled: true,
  generation_enabled: true,
  quiet_enabled: false,
  quiet_start: '22:00',
  quiet_end: '09:00',
  timezone: 'Europe/Moscow',
};
beforeEach(() => {
  vi.mocked(api.get)
    .mockReset()
    .mockResolvedValue({ data: preferences } as Awaited<ReturnType<typeof api.get>>);
  vi.mocked(api.put)
    .mockReset()
    .mockImplementation(
      async (_, value) => ({ data: value }) as Awaited<ReturnType<typeof api.put>>,
    );
});
afterEach(cleanup);
it('loads and saves shared push preferences with quiet hours', async () => {
  render(<NotificationPreferences />);
  fireEvent.click(await screen.findByLabelText('Тихие часы'));
  fireEvent.change(screen.getByLabelText('Не беспокоить с'), { target: { value: '21:30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить уведомления' }));
  await screen.findByText('Настройки сохранены на всех устройствах.');
  expect(api.put).toHaveBeenCalledWith('/notifications/preferences', {
    ...preferences,
    quiet_enabled: true,
    quiet_start: '21:30',
  });
});
it('retains edited settings and does not report success after a failed save', async () => {
  vi.mocked(api.put).mockRejectedValueOnce(new Error('Соединение прервано'));
  render(<NotificationPreferences />);
  fireEvent.click(await screen.findByLabelText('Push на устройствах'));
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить уведомления' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Push на устройствах')).not.toBeChecked();
  expect(screen.queryByText('Настройки сохранены на всех устройствах.')).not.toBeInTheDocument();
});
