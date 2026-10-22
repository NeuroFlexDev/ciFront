import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ArchivePanel from './ArchivePanel';
import { GroupForm } from './GroupsPage';
import WebhooksPanel from '../Integrations/WebhooksPanel';
import { api } from '@/shared/api';
import { ApiError } from '@/shared/errors';
import { setDraftOwner, writeDraft } from '@/shared/drafts';

const capabilityPath = '/team/management-capabilities';
const capabilities = { version: 1, tenant_archive_restore: true, webhook_update: true };
const auth = vi.hoisted(() => ({ user: { id: 451, organization_id: 2, organization_role: 'owner' } }));
vi.mock('@/auth/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/shared/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() }, apiFetch: vi.fn() }));
beforeEach(() => { vi.resetAllMocks(); auth.user.id++; setDraftOwner(auth.user.id); });
afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); });

it('keeps an archived group after a conflict and restores only with the refreshed token', async () => {
  let token = 'a'.repeat(64), restored = false;
  vi.mocked(api.get).mockImplementation(async path => ({ data: path === capabilityPath ? capabilities : { items: restored ? [] : [{ id: 7, name: 'Safety', state_token: token }] } }) as never);
  vi.mocked(api.post).mockImplementation(async () => {
    if (token[0] === 'a') throw new ApiError('Changed elsewhere', 409, 'http');
    restored = true; return { data: {} } as never;
  });
  const changed = vi.fn(async () => undefined);
  render(<ArchivePanel kind="groups" onRestored={changed} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Восстановить' }));
  await screen.findByText(/Changed elsewhere/);
  expect(changed).not.toHaveBeenCalled();
  expect(screen.getByText('Safety')).toBeInTheDocument();
  token = 'b'.repeat(64);
  fireEvent.click(screen.getByRole('button', { name: 'Обновить архив' }));
  await waitFor(() => expect(vi.mocked(api.get).mock.calls.filter(([path]) => path === '/team/groups?archived=true')).toHaveLength(2));
  fireEvent.click(screen.getByRole('button', { name: 'Восстановить' }));
  await screen.findByText('Архив пуст.');
  expect(api.post).toHaveBeenLastCalledWith('/team/groups/7/restore', { expected_state: token });
  expect(changed).toHaveBeenCalledTimes(1);
});

it('shows archived program history without silently creating a new enrollment', async () => {
  vi.mocked(api.get).mockImplementation(async path => ({ data: path === capabilityPath ? capabilities : String(path).includes('enrollments')
    ? { items: [{ id: 31, user_id: 4, program_revision: 1, assignments: [{ id: 8, title: 'Published course', progress_percent: 67 }] }] }
    : { items: [{ id: 2, title: 'Archived program', revision: 6 }] } }) as never);
  vi.mocked(api.post).mockResolvedValue({ data: {} } as never);
  render(<ArchivePanel kind="programs" onRestored={async () => undefined} />);
  fireEvent.click(await screen.findByRole('button', { name: 'История назначений' }));
  expect(await screen.findByText('Published course · 67%')).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Восстановить' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/team/programs/2/restore', { expected_revision: 6 }));
});

it('preserves a legacy group draft and requires comparison before obtaining a current token', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: capabilities } as never);
  writeDraft('learning-group:1', { name: 'My unsaved name', description: 'My draft' }, undefined, auth.user.id);
  vi.mocked(api.put).mockResolvedValue({ data: { state_token: 'b'.repeat(64) } } as never);
  render(<MemoryRouter><GroupForm group={{ id: 1, name: 'Server name', description: 'Server description', is_archived: false,
    state_token: 'a'.repeat(64), user_ids: [], staff: [] }} members={[]} canManage reload={async () => undefined} onArchive={() => undefined} /></MemoryRouter>);
  expect(screen.getByLabelText('Название')).toHaveValue('My unsaved name');
  expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
  expect(api.put).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить мои изменения поверх после сравнения' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Сохранить' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/team/groups/1', {
    name: 'My unsaved name', description: 'My draft', expected_state: 'a'.repeat(64),
  }));
});

it('preserves the webhook draft after a version conflict and saves only after explicit comparison', async () => {
  let current = { id: 5, url: 'https://old.example.test/events', events: ['course.published'], enabled: true, state_token: 'a'.repeat(64) };
  vi.mocked(api.get).mockImplementation(async path => ({ data: path === capabilityPath ? capabilities : { items: [current], events: ['course.published'] } }) as never);
  vi.mocked(api.put).mockImplementationOnce(async () => {
    current = { ...current, url: 'https://other.example.test/events', state_token: 'b'.repeat(64) };
    throw new ApiError('Changed elsewhere', 409, 'http');
  }).mockResolvedValue({ data: {} } as never);
  render(<WebhooksPanel />);
  fireEvent.click(await screen.findByRole('button', { name: 'Изменить подключение' }));
  fireEvent.change(screen.getByLabelText('Новый HTTPS-адрес обработчика'), { target: { value: 'https://mine.example.test/events' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить подключение' }));
  await screen.findByText('Сравните сохранённую запись');
  expect(screen.getByLabelText('Новый HTTPS-адрес обработчика')).toHaveValue('https://mine.example.test/events');
  expect(screen.getByRole('button', { name: 'Сохранить подключение' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить мои изменения поверх после сравнения' }));
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить подключение' }));
  await waitFor(() => expect(api.put).toHaveBeenLastCalledWith('/integrations/webhooks/5', {
    url: 'https://mine.example.test/events', events: ['course.published'], enabled: true, expected_state: 'b'.repeat(64),
  }));
});


it('does not mistake active records for archived records on an old server', async () => {
  vi.mocked(api.get).mockImplementation(async path => {
    if (path === capabilityPath) throw new ApiError('Not found', 404, 'http');
    return { data: { items: [{ id: 1, name: 'Active record from old server' }] } } as never;
  });
  render(<ArchivePanel kind="groups" onRestored={async () => undefined} />);
  expect(await screen.findByText(/Сервер ещё не поддерживает/)).toBeInTheDocument();
  expect(screen.queryByText('Active record from old server')).not.toBeInTheDocument();
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(api.get).toHaveBeenCalledWith(capabilityPath);
  expect(screen.getByRole('button', { name: 'Обновить архив' })).toBeDisabled();
  expect(api.post).not.toHaveBeenCalled();
});

it('preserves an edit draft and blocks incompatible webhook writes on an old server', async () => {
  writeDraft('integrations:webhook-edit', { id: 5, url: 'https://mine.example.test/events', events: ['course.published'], enabled: true, expected_state: 'a'.repeat(64) }, undefined, auth.user.id);
  vi.mocked(api.get).mockImplementation(async path => {
    if (path === capabilityPath) throw new ApiError('Not found', 404, 'http');
    return { data: { items: [{ id: 5, url: 'https://old.example.test/events', events: ['course.published'], enabled: true, state_token: 'a'.repeat(64) }], events: ['course.published'] } } as never;
  });
  render(<WebhooksPanel />);
  await screen.findByText(/Сервер ещё не поддерживает/);
  expect(screen.getByLabelText('Новый HTTPS-адрес обработчика')).toHaveValue('https://mine.example.test/events');
  expect(screen.getByRole('button', { name: 'Сохранить подключение' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Отключить доставку' })).toBeDisabled();
  fireEvent.submit(screen.getByLabelText('Новый HTTPS-адрес обработчика').closest('form')!);
  expect(api.put).not.toHaveBeenCalled();
  expect(api.delete).not.toHaveBeenCalled();
});
