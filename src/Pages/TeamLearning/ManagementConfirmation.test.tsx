import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Departments, GroupForm, PersonForm } from './GroupsPage';
import ProgramsPage from './ProgramsPage';
import TeamSettingsPage from './TeamSettingsPage';
import { api } from '@/shared/api';
import { setDraftOwner } from '@/shared/drafts';

const auth = vi.hoisted(() => ({ user: { id: 901, organization_id: 2, organization_role: 'owner' }, logout: vi.fn() }));
vi.mock('@/auth/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/shared/api', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() }, apiFetch: vi.fn() }));
vi.mock('@/Pages/Workspace/WorkspaceComponents', () => ({ Shell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('@/Components/ResourceUsagePanel', () => ({ default: () => null }));
vi.mock('./CourseTransferPanel', () => ({ default: () => null }));
const member = { id: 42, full_name: 'Тестовый участник', email: 'member@example.test', is_active: true, organization_role: 'member' };
const group = { id: 7, name: 'QA группа', description: 'Проверка управления', is_archived: false, state_token: 'a'.repeat(64), user_ids: [42], staff: [] };
const program = { id: 9, title: 'QA программа', description: '', revision: 4, steps: [], recurrence_days: null, reminder_days: 3, is_archived: false };
const reload = vi.fn(async () => undefined);
beforeEach(() => {
  vi.resetAllMocks(); auth.user.id++; setDraftOwner(auth.user.id);
  vi.spyOn(window, 'confirm').mockImplementation(() => { throw new Error('Native confirm must not open'); });
  vi.mocked(api.get).mockImplementation(async path => ({ data:
    path === '/team/management-capabilities' ? { version: 1, tenant_archive_restore: true, webhook_update: true } :
    path === '/team/permissions' ? { can_manage_team: false, can_manage_admins: true } :
    path === '/team/settings' ? null :
    path === '/team' ? { members: [member], can_manage: true } :
    path === '/team/programs' ? { items: [program] } :
    String(path).endsWith('/roles') ? { role: 'member', items: [{ id: 12, role: 'author', scope_type: 'organization', scope_id: 0 }] } :
    { items: [] } }) as never);
  vi.mocked(api.post).mockResolvedValue({ data: {} } as never);
  vi.mocked(api.delete).mockResolvedValue({ data: {} } as never);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });
const mount = (content: ReactNode) => render(<MemoryRouter>{content}</MemoryRouter>);

async function open(trigger: HTMLElement) {
  await waitFor(() => expect(trigger).toBeEnabled());
  trigger.focus(); fireEvent.click(trigger);
  return await screen.findByRole('alertdialog');
}

it('traps keyboard focus, cancels with Escape and restores focus without archiving', async () => {
  mount(<GroupForm group={group} members={[member]} canManage reload={reload} onArchive={vi.fn()} />);
  const trigger = screen.getByRole('button', { name: 'Архивировать группу' });
  const dialog = await open(trigger);
  const cancel = within(dialog).getByRole('button', { name: 'Отмена' });
  const accept = within(dialog).getByRole('button', { name: 'Архивировать' });
  expect(cancel).toHaveFocus();
  fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
  expect(accept).toHaveFocus();
  fireEvent.keyDown(accept, { key: 'Tab' });
  expect(cancel).toHaveFocus();
  trigger.focus(); expect(cancel).toHaveFocus();
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(api.post).not.toHaveBeenCalled();
  expect(window.confirm).not.toHaveBeenCalled();
});

it('archives with the captured version exactly once and cannot dismiss while the request is pending', async () => {
  let resolve!: () => void;
  vi.mocked(api.post).mockImplementation(() => new Promise(done => { resolve = () => done({ data: {} } as never); }));
  const archived = vi.fn();
  mount(<GroupForm group={group} members={[member]} canManage reload={reload} onArchive={archived} />);
  const dialog = await open(screen.getByRole('button', { name: 'Архивировать группу' }));
  const accept = within(dialog).getByRole('button', { name: 'Архивировать' });
  fireEvent.click(accept); fireEvent.click(accept);
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith('/team/groups/7/archive', { expected_state: group.state_token });
  expect(within(dialog).getByRole('button', { name: 'Отмена' })).toBeDisabled();
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(dialog).toBeInTheDocument();
  await act(async () => resolve());
  expect(archived).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

it.each(['member', 'department', 'role'] as const)('requires in-app confirmation for %s removal and cancels without a request', async kind => {
  if (kind === 'member') mount(<GroupForm group={group} members={[member]} canManage reload={reload} onArchive={vi.fn()} />);
  else if (kind === 'department') mount(<Departments data={[{ id: 5, name: 'QA отдел', parent_id: null, is_archived: false, state_token: group.state_token }]} canManage reload={reload} />);
  else mount(<PersonForm member={member} departments={[]} groups={[]} canManage reload={reload} />);
  const label = kind === 'member' ? 'Убрать' : kind === 'department' ? 'Архивировать' : 'Отозвать';
  const trigger = await screen.findByRole('button', { name: label });
  let dialog = await open(trigger);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }));
  expect(api.post).not.toHaveBeenCalled(); expect(api.delete).not.toHaveBeenCalled();
  expect(trigger).toHaveFocus();
  dialog = await open(trigger);
  fireEvent.click(within(dialog).getByRole('button', { name: label }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  if (kind === 'department') expect(api.post).toHaveBeenCalledExactlyOnceWith('/team/departments/5/archive', { expected_state: group.state_token });
  else expect(api.delete).toHaveBeenCalledExactlyOnceWith(kind === 'member' ? '/team/groups/7/members/42' : '/team/members/42/roles/12');
});

it('confirms program archive with its version and preserves the form when cancelled', async () => {
  mount(<ProgramsPage />);
  fireEvent.click(await screen.findByRole('button', { name: /QA программа/ }));
  const trigger = screen.getByRole('button', { name: 'Архивировать' });
  let dialog = await open(trigger);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }));
  expect(screen.getByDisplayValue('QA программа')).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
  dialog = await open(trigger);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Архивировать' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledExactlyOnceWith('/team/programs/9/archive', { expected_revision: 4 }));
});

it('does not create a new cycle until explicit confirmation, or enroll anyone on confirmation alone', async () => {
  mount(<ProgramsPage />);
  fireEvent.click(await screen.findByRole('button', { name: /QA программа/ }));
  fireEvent.click(screen.getByText('Назначить программу'));
  const trigger = screen.getByRole('button', { name: 'Отдельный новый цикл' });
  let dialog = await open(trigger);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }));
  expect(screen.getByText('Первое назначение. Повторное нажатие не создаёт дубль.')).toBeInTheDocument();
  dialog = await open(trigger);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Выбрать новый цикл' }));
  await screen.findByText('Выбран отдельный цикл. Повторная отправка этой формы не создаёт дубль.');
  expect(api.post).not.toHaveBeenCalled();
});

it.each(['offer', 'accept'] as const)('keeps ownership %s behind the same explicit confirmation', async kind => {
  const original = vi.mocked(api.get).getMockImplementation()!;
  vi.mocked(api.get).mockImplementation(async path => path === '/team/ownership-transfers'
    ? { data: { items: kind === 'accept' ? [{ id: 16, to_user_id: auth.user.id, from_user_id: 42, expires_at: '2026-11-01T00:00:00' }] : [] } } as never
    : original(path));
  mount(<TeamSettingsPage />);
  const label = kind === 'offer' ? 'Предложить передачу' : 'Принять владение';
  const trigger = await screen.findByRole('button', { name: label });
  if (kind === 'offer') {
    await screen.findByRole('option', { name: member.full_name });
    fireEvent.change(screen.getByLabelText('Новый владелец'), { target: { value: String(member.id) } });
  }
  let dialog = await open(trigger);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }));
  expect(api.post).not.toHaveBeenCalled(); expect(auth.logout).not.toHaveBeenCalled();
  dialog = await open(trigger);
  fireEvent.click(within(dialog).getByRole('button', { name: label }));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  if (kind === 'offer') expect(api.post).toHaveBeenCalledWith('/team/ownership-transfers', { user_id: 42 });
  else {
    expect(api.post).toHaveBeenCalledWith('/team/ownership-transfers/16/accept');
    await waitFor(() => expect(auth.logout).toHaveBeenCalledTimes(1));
  }
});
