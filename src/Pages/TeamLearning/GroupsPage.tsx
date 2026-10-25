import PersonWorkspace from './PersonWorkspace';
import { useRoleNames } from './useRoleNames';
import { useLocale } from '@/i18n/useLocale';
import { useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, apiFetch } from '@/shared/api';
import { ApiError } from '@/shared/errors';
import { useAuth } from '@/auth/useAuth';
import { useDurableState } from '@/hooks/useDurableState';
import { Shell } from '@/Pages/Workspace/shared';
import { LoadingState, RequestError } from '@/Components/RequestState';
import { useLearningData } from '../Learning/useLearningData';
import { ActionStatus, useTeamAction } from './TeamTools';
import {
  type Department,
  type Group,
  type Person,
  type RoleGrant,
  type Team,
  type TeamMember,
  initials,
} from './types';
import s from '../Learning/learning.module.css';
import AdminDialog from '@/Components/Admin/AdminDialog';
import ArchivePanel from './ArchivePanel';
import { ManagementCapabilityNotice } from './ManagementCapability';
import { useManagementCapability } from './useManagementCapability';
import { useManagementConfirmation } from './useManagementConfirmation';

export default function GroupsPage() {
  const roleName = useRoleNames();

  const { t } = useLocale();

  const { user } = useAuth();
  const invitationPath =
    user?.organization_kind === 'business' ? '/company?tab=employees' : '/team';
  const capability = useManagementCapability();
  const team = useLearningData<Team>('/team');
  const groups = useLearningData<{ items: Group[] }>('/team/groups');
  const departments = useLearningData<{ items: Department[] }>('/team/departments');
  const people = useLearningData<{ items: Person[] }>('/team/people');
  const [params, setParams] = useSearchParams();
  const tab = ['groups', 'people', 'departments'].includes(params.get('tab') ?? '')
    ? params.get('tab')!
    : 'groups';
  const setTab = (value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('tab', value);
      next.delete('user');
      next.delete('group');
      next.delete('department');
      return next;
    });
  const [creating, setCreating] = useState(false);
  const [archived, setArchived] = useState(false);
  const selected = Number(params.get(tab === 'people' ? 'user' : 'group')) || null;
  const setSelected = (id: number | null) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('group');
      next.delete('user');
      if (id) next.set(tab === 'people' ? 'user' : 'group', String(id));
      return next;
    });
  const [query, setQuery] = useState('');
  const personPanel = useRef<HTMLDivElement>(null);
  const selectPerson = (id: number) => {
    setSelected(id);
    requestAnimationFrame(() => personPanel.current?.focus());
  };
  const exportAction = useTeamAction();
  const exportPeople = () =>
    void exportAction.run(async () => {
      const response = await apiFetch('/team/people/export');
      if (!response.ok)
        throw new ApiError(t('Не удалось выгрузить участников'), response.status, 'http');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'learning-people.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, t('Список участников выгружен. Выгрузка записана в журнал.'));
  const reload = async () => {
    await Promise.all([team.reload(), groups.reload(), departments.reload(), people.reload()]);
  };
  return (
    <Shell
      title={t('Сотрудники')}
      description={t('Состав команды, учебные группы, подразделения и права в конкретной области.')}
    >
      <div className={s.page}>
        {[team, groups, departments, people].map((r, i) =>
          r.error ? <RequestError key={i} error={r.error} onRetry={() => void r.reload()} /> : null,
        )}
        {!team.data && team.loading ? (
          <LoadingState>{t('Загружаем команду…')}</LoadingState>
        ) : (
          team.data && (
            <>
              <nav className={s.peopleNavigation} aria-label={t('Разделы команды')}>
                {[
                  ['people', 'Участники'],
                  ['departments', 'Подразделения'],
                  ['groups', 'Группы'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={tab === key}
                    onClick={() => {
                      setTab(key);
                      setArchived(false);
                    }}
                  >
                    {t(label)}
                  </button>
                ))}
                <Link to={invitationPath}>{t('Приглашения')}</Link>
              </nav>
              <div className={s.peopleToolbar}>
                {team.data.can_manage && (
                  <button
                    className={s.secondary}
                    disabled={exportAction.busy}
                    onClick={exportPeople}
                  >
                    {t('Скачать участников CSV ↓')}
                  </button>
                )}
                <Link className={s.primary} to={invitationPath}>
                  {t('Пригласить участника')}
                </Link>
              </div>
              <ActionStatus action={exportAction} />
              {team.data.can_manage && tab !== 'people' && (
                <ManagementCapabilityNotice capability={capability} />
              )}
              {team.data.can_manage && tab !== 'people' && (
                <button
                  className={s.secondary}
                  disabled={!capability.supported}
                  aria-pressed={archived}
                  onClick={() => {
                    setArchived(!archived);
                    setSelected(null);
                  }}
                >
                  {t(archived ? 'К активным записям' : 'Открыть архив')}
                </button>
              )}
              {archived && tab !== 'people' && (
                <ArchivePanel
                  key={tab}
                  kind={tab === 'groups' ? 'groups' : 'departments'}
                  onRestored={reload}
                />
              )}
              {!archived && tab === 'groups' && (
                <>
                  <div className={s.groupToolbar}>
                    <label className={s.field}>
                      {t('Поиск группы')}
                      <input
                        value={query}
                        placeholder={t('Поиск по названию группы')}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    {team.data.can_manage && (
                      <button className={s.primary} onClick={() => setCreating(true)}>
                        {t('Создать группу')}
                      </button>
                    )}
                  </div>
                  {selected && groups.data?.items.some((g) => g.id === selected) ? (
                    <>
                      <button className={s.secondary} onClick={() => setSelected(null)}>
                        {t('← Все группы')}
                      </button>
                      <GroupForm
                        key={selected}
                        group={groups.data.items.find((g) => g.id === selected)!}
                        members={team.data.members}
                        canManage={team.data.can_manage}
                        reload={reload}
                        onArchive={() => setSelected(null)}
                      />
                    </>
                  ) : (
                    <div className={s.groupCards}>
                      {groups.data?.items
                        .filter((g) => g.name.toLowerCase().includes(query.toLowerCase()))
                        .map((g) => (
                          <article className={s.groupCard} key={g.id}>
                            <button
                              className={s.cornerAction}
                              aria-label={`${t('Открыть группу')} · ${g.name}`}
                              onClick={() => setSelected(g.id)}
                            >
                              <ArrowUpRight size={24} aria-hidden='true' />
                            </button>
                            <div className={s.avatar} aria-hidden='true'>
                              {initials(g.name)}
                            </div>
                            <h2>{g.name}</h2>
                            <p className={s.accent}>
                              {t('Участников')}: {g.user_ids.length}
                            </p>
                            <p className={s.muted}>
                              {t('Ответственных')}: {g.staff.length}
                            </p>
                            {team.data?.can_manage ? (
                              <Link className={s.primary} to={`/assignments?group=${g.id}`}>
                                {t('Назначить курс')}
                              </Link>
                            ) : (
                              <button className={s.secondary} onClick={() => setSelected(g.id)}>
                                {t('Открыть группу')}
                              </button>
                            )}
                          </article>
                        ))}
                    </div>
                  )}
                  {!groups.loading && !groups.error && !groups.data?.items.length && (
                    <section className={s.empty}>
                      <h2>{t('Группы ещё не созданы')}</h2>
                      <p>
                        {t(
                          'Объедините участников, чтобы назначать обучение всей группе и отслеживать результаты.',
                        )}
                      </p>
                    </section>
                  )}
                  {!!query &&
                    !!groups.data?.items.length &&
                    !groups.data.items.some((g) =>
                      g.name.toLowerCase().includes(query.toLowerCase()),
                    ) && (
                      <section className={s.empty}>
                        <h2>{t('Группа не найдена')}</h2>
                        <button className={s.secondary} onClick={() => setQuery('')}>
                          {t('Сбросить поиск')}
                        </button>
                      </section>
                    )}
                  {creating && (
                    <AdminDialog
                      title={t('Новая группа')}
                      onClose={() => setCreating(false)}
                      guard
                      className={s.page}
                    >
                      <GroupCreate
                        reload={reload}
                        onCreated={(id) => {
                          setSelected(id);
                          setCreating(false);
                        }}
                      />
                    </AdminDialog>
                  )}
                </>
              )}
              {tab === 'people' && (
                <>
                  {selected && !team.data.members.some((member) => member.id === selected) && (
                    <section className={s.empty}>
                      <h2>{t('Участник недоступен')}</h2>
                      <p>{t('Участник не найден в вашей области доступа.')}</p>
                      <button className={s.secondary} onClick={() => setSelected(null)}>
                        {t('← Все участники')}
                      </button>
                    </section>
                  )}
                  {!selected && (
                    <>
                      <label className={s.field}>
                        {t('Поиск участника')}
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder={t('Имя или почта')}
                        />
                      </label>
                      <div className={s.grid} style={{ marginTop: 24 }}>
                        {team.data.members
                          .filter((m) =>
                            (m.full_name + ' ' + m.email)
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                          )
                          .map((m) => (
                            <article className={`${s.person} ${s.personCard}`} key={m.id}>
                              <button
                                className={s.cornerAction}
                                aria-label={`${t('Карточка и права')} · ${m.full_name || m.username || m.email || t('Участник')}`}
                                aria-expanded={selected === m.id}
                                aria-controls='team-person-details'
                                onClick={() => selectPerson(m.id)}
                              >
                                <ArrowUpRight size={26} strokeWidth={1.5} aria-hidden='true' />
                              </button>
                              <div className={s.avatar}>
                                {initials(m.full_name || m.username || m.email || t('Участник'))}
                              </div>
                              <h3>{m.full_name || m.username || m.email || t('Участник')}</h3>
                              <p className={s.muted}>{m.email || m.username}</p>
                              <p className={s.accent}>
                                {people.data?.items.find((p) => p.user_id === m.id)?.position ||
                                  roleName(m.organization_role)}
                              </p>
                              <span className={s.badge}>
                                {m.is_active ? t('Активен') : t('Доступ отозван')}
                              </span>
                              <Link className={s.primary} to={`/assignments?user=${m.id}`}>
                                {t('Назначить')}
                              </Link>
                            </article>
                          ))}
                      </div>
                    </>
                  )}
                  {selected && team.data.members.find((m) => m.id === selected) && (
                    <div
                      id='team-person-details'
                      ref={personPanel}
                      tabIndex={-1}
                      className={s.selectionPanel}
                    >
                      <PersonWorkspace
                        key={selected}
                        member={team.data.members.find((m) => m.id === selected)!}
                        person={people.data?.items.find((p) => p.user_id === selected)}
                        departments={departments.data?.items ?? []}
                        groups={groups.data?.items ?? []}
                        onBack={() => setSelected(null)}
                      >
                        <PersonForm
                          key={selected}
                          member={team.data.members.find((m) => m.id === selected)!}
                          person={people.data?.items.find((p) => p.user_id === selected)}
                          departments={departments.data?.items ?? []}
                          groups={groups.data?.items ?? []}
                          canManage={team.data.can_manage}
                          reload={reload}
                        />
                      </PersonWorkspace>
                    </div>
                  )}
                </>
              )}
              {!archived && tab === 'departments' && (
                <Departments
                  data={departments.data?.items ?? []}
                  members={team.data.members}
                  people={people.data?.items ?? []}
                  canManage={team.data.can_manage}
                  reload={reload}
                />
              )}
            </>
          )
        )}
      </div>
    </Shell>
  );
}

function GroupCreate({
  reload,
  onCreated,
}: {
  reload: () => Promise<void>;
  onCreated: (id: number) => void;
}) {
  const { t } = useLocale();

  const [draft, setDraft, clear] = useDurableState('new-learning-group', {
    name: '',
    description: '',
  });
  const action = useTeamAction();
  return (
    <form
      className={s.card}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          const result = await api.post<Group>('/team/groups', draft);
          clear(draft);
          await reload();
          onCreated(result.data.id);
        }, t('Группа создана'));
      }}
    >
      <h2>{t('Новая группа')}</h2>
      <div className={s.stack}>
        <label className={s.field}>
          {t('Название')}
          <input
            required
            maxLength={200}
            value={draft.name}
            disabled={action.busy}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label className={s.field}>
          {t('Описание')}
          <textarea
            maxLength={10000}
            value={draft.description}
            disabled={action.busy}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </label>
        <button className={s.primary} disabled={action.busy || !draft.name.trim()}>
          {t('Создать группу')}
        </button>
        <ActionStatus action={action} />
      </div>
    </form>
  );
}

export function GroupForm({
  group,
  members,
  canManage,
  reload,
  onArchive,
}: {
  group: Group;
  members: TeamMember[];
  canManage: boolean;
  reload: () => Promise<void>;
  onArchive: () => void;
}) {
  const roleName = useRoleNames();

  const { t } = useLocale();
  const capability = useManagementCapability();

  const [draft, setDraft, clear] = useDurableState(`learning-group:${group.id}`, {
    name: group.name,
    description: group.description,
    expected_state: group.state_token,
  });
  const [add, setAdd] = useState<number[]>([]);
  const action = useTeamAction();
  const conflict = draft.expected_state !== group.state_token || !draft.expected_state;
  const confirmation = useManagementConfirmation();
  return (
    <section className={s.card}>
      {confirmation.dialog}
      <h2>{group.name}</h2>
      {canManage && <ManagementCapabilityNotice capability={capability} />}
      {conflict && (
        <div className={s.conflict}>
          <h3>{t('Сравните сохранённую запись')}</h3>
          <p>{group.name}</p>
          <p>{group.description}</p>
          <p>{t('Ваш черновик сохранён. Подтвердите текущую версию перед записью изменений.')}</p>
          <button
            className={s.secondary}
            disabled={action.busy}
            onClick={() => setDraft({ ...draft, expected_state: group.state_token })}
          >
            {t('Сохранить мои изменения поверх после сравнения')}
          </button>
        </div>
      )}
      <form
        className={s.stack}
        onSubmit={(e) => {
          e.preventDefault();
          if (!capability.supported || conflict) return;
          void action.run(async () => {
            try {
              const result = await api.put<Group>(`/team/groups/${group.id}`, draft);
              clear(draft);
              const saved = { ...draft, expected_state: result.data.state_token };
              setDraft(saved);
              clear(saved);
              await reload();
            } catch (error) {
              await reload();
              throw error;
            }
          });
        }}
      >
        <label className={s.field}>
          {t('Название')}
          <input
            disabled={!canManage || action.busy}
            required
            maxLength={200}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label className={s.field}>
          {t('Описание')}
          <textarea
            disabled={!canManage || action.busy}
            maxLength={10000}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </label>
        {canManage && (
          <div className={s.row}>
            <button
              className={s.primary}
              disabled={!capability.supported || action.busy || conflict}
            >
              {t('Сохранить')}
            </button>
            <Link className={s.secondary} to='/assignments'>
              {t('Назначить обучение')}
            </Link>
          </div>
        )}
      </form>
      <hr className={s.divider} />
      <h3>
        {t('Состав ·') + ' '}
        {group.user_ids.length}
      </h3>
      {group.user_ids.map((uid) => {
        const m = members.find((v) => v.id === uid);
        return (
          <div className={s.spread} key={uid}>
            <p>{m?.full_name || m?.email || t('Участник {v0}', { v0: uid })}</p>
            {canManage && (
              <button
                className={s.secondary}
                disabled={action.busy}
                onClick={() =>
                  confirmation.ask({
                    title: t('Убрать участника из группы'),
                    description: t(
                      'Убрать участника из группы? Его ранее назначенные курсы и результаты сохранятся.',
                    ),
                    confirmLabel: t('Убрать'),
                    action: () =>
                      action.run(async () => {
                        await api.delete(`/team/groups/${group.id}/members/${uid}`);
                        await reload();
                      }, t('Участник убран из группы. Результаты сохранены.')),
                  })
                }
              >
                {t('Убрать')}
              </button>
            )}
          </div>
        );
      })}
      {!group.user_ids.length && (
        <p className={s.muted}>{t('Добавьте участников, чтобы назначать обучение всей группе.')}</p>
      )}
      {canManage && (
        <details>
          <summary>{t('Добавить участников')}</summary>
          <div className={s.stack}>
            {members
              .filter((m) => m.is_active && !group.user_ids.includes(m.id))
              .map((m) => (
                <label className={s.check} key={m.id}>
                  <input
                    type='checkbox'
                    checked={add.includes(m.id)}
                    onChange={(e) =>
                      setAdd(e.target.checked ? [...add, m.id] : add.filter((id) => id !== m.id))
                    }
                  />
                  <span>{m.full_name || m.username || m.email || t('Участник')}</span>
                </label>
              ))}
            <button
              className={s.primary}
              disabled={action.busy || !add.length}
              onClick={() =>
                void action.run(async () => {
                  await api.post(`/team/groups/${group.id}/members`, {
                    user_ids: add,
                  });
                  setAdd([]);
                  await reload();
                }, t('Участники добавлены. Действующие групповые назначения применены.'))
              }
            >
              {t('Добавить выбранных')}
            </button>
          </div>
        </details>
      )}
      {!!group.staff.length && (
        <section>
          <h3>{t('Ответственные')}</h3>
          {group.staff.map((g) => (
            <p key={g.id}>
              {members.find((m) => m.id === g.user_id)?.full_name ||
                t('Участник {v0}', { v0: g.user_id })}{' '}
              · {roleName(g.role)}
            </p>
          ))}
          <p className={s.caption}>
            {t('Изменить область ответственности можно в карточке участника.')}
          </p>
        </section>
      )}
      <ActionStatus action={action} />
      {canManage && (
        <button
          className={s.danger}
          style={{ marginTop: 24 }}
          disabled={!capability.supported || action.busy}
          onClick={() =>
            confirmation.ask({
              title: t('Архивировать группу'),
              description: t(
                'Архивировать группу? Новые участники перестанут получать групповые назначения. История обучения сохраняется.',
              ),
              confirmLabel: t('Архивировать'),
              action: () =>
                action.run(async () => {
                  await api.post(`/team/groups/${group.id}/archive`, {
                    expected_state: group.state_token,
                  });
                  await reload();
                  onArchive();
                }, t('Группа архивирована')),
            })
          }
        >
          {t('Архивировать группу')}
        </button>
      )}
    </section>
  );
}

export function Departments({
  data,
  members = [],
  people = [],
  canManage,
  reload,
}: {
  data: Department[];
  members?: TeamMember[];
  people?: Person[];
  canManage: boolean;
  reload: () => Promise<void>;
}) {
  const { t } = useLocale();
  const capability = useManagementCapability();

  const [draft, setDraft, clear] = useDurableState('learning-department', {
    id: null as number | null,
    name: '',
    parent_id: '',
    expected_state: '',
  });
  const [editing, setEditing] = useState(false);
  const [params, setParams] = useSearchParams();
  const selected = data.find((row) => row.id === Number(params.get('department'))) ?? data[0];
  const selectedPeople = people.filter((person) => person.department_id === selected?.id);
  const select = (value: number) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('department', String(value));
      return next;
    });
  const ordered: { department: Department; depth: number }[] = [];
  const seen = new Set<number>();
  const visit = (department: Department, depth: number) => {
    if (seen.has(department.id)) return;
    seen.add(department.id);
    ordered.push({ department, depth });
    data
      .filter((child) => child.parent_id === department.id)
      .forEach((child) => visit(child, depth + 1));
  };
  data
    .filter((row) => !row.parent_id || !data.some((parent) => parent.id === row.parent_id))
    .forEach((row) => visit(row, 0));
  data.forEach((row) => visit(row, 0));
  const id = draft.id ?? null;
  const current = data.find((row) => row.id === id);
  const conflict = !!id && (!draft.expected_state || draft.expected_state !== current?.state_token);
  const action = useTeamAction();
  const confirmation = useManagementConfirmation();
  return (
    <div className={s.departmentLayout}>
      {confirmation.dialog}
      <aside className={`${s.card} ${s.departmentTree}`}>
        <h2>{t('Структура организации')}</h2>
        {canManage && <ManagementCapabilityNotice capability={capability} />}
        <nav aria-label={t('Подразделения')}>
          {ordered.map(({ department, depth }) => (
            <button
              key={department.id}
              aria-current={selected?.id === department.id ? 'true' : undefined}
              style={{ paddingLeft: 16 + Math.min(depth, 6) * 18 }}
              onClick={() => select(department.id)}
            >
              <span>{department.name}</span>
              <small>
                {people.filter((person) => person.department_id === department.id).length}
              </small>
            </button>
          ))}
        </nav>
        {!data.length && <p className={s.muted}>{t('Подразделения ещё не добавлены.')}</p>}
        {canManage && (
          <button className={s.secondary} onClick={() => setEditing(true)}>
            {t(draft.name ? 'Продолжить редактирование' : 'Добавить подразделение')}
          </button>
        )}
      </aside>
      {selected ? (
        <section className={s.card}>
          {selected.parent_id && (
            <p className={s.muted}>{data.find((row) => row.id === selected.parent_id)?.name}</p>
          )}
          <header className={s.spread}>
            <h2>{selected.name}</h2>
            {canManage && (
              <div className={s.row}>
                <button
                  className={s.secondary}
                  onClick={() => {
                    if (!draft.name)
                      setDraft({
                        id: selected.id,
                        name: selected.name,
                        parent_id: String(selected.parent_id ?? ''),
                        expected_state: selected.state_token,
                      });
                    setEditing(true);
                  }}
                >
                  {t('Изменить')}
                </button>
                <button
                  className={s.danger}
                  disabled={!capability.supported || action.busy}
                  onClick={() =>
                    confirmation.ask({
                      title: t('Архивировать подразделение'),
                      description: t(
                        'Архивировать «{v0}»? Сначала перенесите участников и дочерние подразделения.',
                        { v0: selected.name },
                      ),
                      confirmLabel: t('Архивировать'),
                      action: () =>
                        action.run(async () => {
                          await api.post(`/team/departments/${selected.id}/archive`, {
                            expected_state: selected.state_token,
                          });
                          await reload();
                        }),
                    })
                  }
                >
                  {t('Архивировать')}
                </button>
              </div>
            )}
          </header>
          <div className={s.departmentStats}>
            <div>
              <span>{t('Сотрудников')}</span>
              <strong>{selectedPeople.length}</strong>
            </div>
            <div>
              <span>{t('Вложенных подразделений')}</span>
              <strong>{data.filter((row) => row.parent_id === selected.id).length}</strong>
            </div>
          </div>
          <div className={s.spread}>
            <h3>{t('Участники')}</h3>
            {canManage && (
              <Link className={s.primary} to='/groups?tab=people'>
                {t('Добавить сотрудников')}
              </Link>
            )}
          </div>
          <div className={s.departmentPeople}>
            {selectedPeople.map((person) => {
              const member = members.find((row) => row.id === person.user_id);
              return (
                <Link key={person.user_id} to={`/groups?tab=people&user=${person.user_id}`}>
                  <span className={s.personInitial}>
                    {initials(member?.full_name || member?.username || member?.email || '')}
                  </span>
                  <span>
                    <strong>
                      {member?.full_name || member?.username || member?.email || t('Участник')}
                    </strong>
                    <small>{person.position}</small>
                  </span>
                  <span className={s.muted}>{member?.email}</span>
                </Link>
              );
            })}
          </div>
          {!selectedPeople.length && (
            <p className={s.muted}>
              {t(
                'В подразделении пока нет участников. Выберите подразделение в карточке сотрудника.',
              )}
            </p>
          )}
          <ActionStatus action={action} />
        </section>
      ) : (
        <section className={s.empty}>
          <h2>{t('Структура пока не создана')}</h2>
          <p>{t('Добавьте подразделения, чтобы распределить сотрудников по командам.')}</p>
        </section>
      )}
      {canManage && editing && (
        <AdminDialog
          title={id ? t('Изменить подразделение') : t('Новое подразделение')}
          guard
          busy={action.busy}
          onClose={() => setEditing(false)}
          className={s.page}
        >
          <form
            className={s.card}
            onSubmit={(e) => {
              e.preventDefault();
              if (id && (!capability.supported || conflict)) return;
              void action.run(async () => {
                const body = {
                  name: draft.name,
                  parent_id: draft.parent_id ? Number(draft.parent_id) : null,
                };
                if (id)
                  await api.put(`/team/departments/${id}`, {
                    ...body,
                    expected_state: draft.expected_state,
                  });
                else await api.post('/team/departments', body);
                clear(draft);
                setDraft({ id: null, name: '', parent_id: '', expected_state: '' });
                await reload();
                setEditing(false);
              });
            }}
          >
            <h2>{id ? t('Изменить подразделение') : t('Новое подразделение')}</h2>
            <fieldset
              disabled={action.busy}
              style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
            >
              {conflict && (
                <div className={s.conflict}>
                  <h3>{t('Сравните сохранённую запись')}</h3>
                  <p>{current?.name ?? t('Запись недоступна в активном списке.')}</p>
                  <p>
                    {t(
                      'Ваш черновик сохранён. Подтвердите текущую версию перед записью изменений.',
                    )}
                  </p>
                  {current && (
                    <button
                      type='button'
                      className={s.secondary}
                      onClick={() => setDraft({ ...draft, expected_state: current.state_token })}
                    >
                      {t('Сохранить мои изменения поверх после сравнения')}
                    </button>
                  )}
                </div>
              )}
              {!!action.error && (
                <button type='button' className={s.secondary} onClick={() => void reload()}>
                  {t('Обновить текущую запись')}
                </button>
              )}
              <div className={s.stack}>
                <label className={s.field}>
                  {t('Название')}
                  <input
                    required
                    maxLength={200}
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </label>
                <label className={s.field}>
                  {t('Входит в подразделение')}
                  <select
                    value={draft.parent_id}
                    onChange={(e) => setDraft({ ...draft, parent_id: e.target.value })}
                  >
                    <option value=''>{t('Корневой уровень')}</option>
                    {data
                      .filter((d) => d.id !== id)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </label>
                <div className={s.row}>
                  <button
                    className={s.primary}
                    disabled={
                      action.busy ||
                      conflict ||
                      (!!id && !capability.supported) ||
                      !draft.name.trim()
                    }
                  >
                    {t('Сохранить')}
                  </button>
                  {id && (
                    <button
                      type='button'
                      className={s.secondary}
                      onClick={() => {
                        setDraft({ id: null, name: '', parent_id: '', expected_state: '' });
                      }}
                    >
                      {t('Новое подразделение')}
                    </button>
                  )}
                </div>
                <ActionStatus action={action} />
              </div>
            </fieldset>
          </form>
        </AdminDialog>
      )}
    </div>
  );
}

export function PersonForm({
  member,
  person,
  departments,
  groups,
  canManage,
  reload,
}: {
  member: TeamMember;
  person?: Person;
  departments: Department[];
  groups: Group[];
  canManage: boolean;
  reload: () => Promise<void>;
}) {
  const { t } = useLocale();

  const { user } = useAuth();
  const [draft, setDraft, clear] = useDurableState(`learning-person:${member.id}`, {
    position: person?.position ?? '',
    department_id: person?.department_id ? String(person.department_id) : '',
    external_id: person?.external_id ?? '',
    attributes: person?.attributes ?? {},
    attributeRows: undefined as { key: string; value: string }[] | undefined,
  });
  const action = useTeamAction();
  const attributeRows =
    draft.attributeRows ?? Object.entries(draft.attributes).map(([key, value]) => ({ key, value }));
  return (
    <section className={s.card} style={{ marginTop: 28 }}>
      <h2>{member.full_name || member.email}</h2>
      <form
        className={s.stack}
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            if (
              attributeRows.some((row) => !row.key.trim()) ||
              new Set(attributeRows.map((row) => row.key.trim())).size !== attributeRows.length
            )
              throw new Error(
                t('Названия дополнительных полей должны быть заполнены и не повторяться.'),
              );
            const { attributeRows: rows, ...payload } = draft;
            void rows;
            await api.put(`/team/people/${member.id}`, {
              ...payload,
              attributes: Object.fromEntries(
                attributeRows.map((row) => [row.key.trim(), row.value]),
              ),
              department_id: draft.department_id ? Number(draft.department_id) : null,
              external_id: draft.external_id || null,
            });
            clear(draft);
            await reload();
          });
        }}
      >
        <div className={s.formGrid}>
          <label className={s.field}>
            {t('Должность')}
            <input
              disabled={!canManage || action.busy}
              maxLength={200}
              value={draft.position}
              onChange={(e) => setDraft({ ...draft, position: e.target.value })}
            />
          </label>
          <label className={s.field}>
            {t('Подразделение')}
            <select
              disabled={!canManage || action.busy}
              value={draft.department_id}
              onChange={(e) => setDraft({ ...draft, department_id: e.target.value })}
            >
              <option value=''>{t('Не указано')}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            {t('Идентификатор в организации')}
            <input
              disabled={!canManage || action.busy}
              maxLength={200}
              value={draft.external_id}
              onChange={(e) => setDraft({ ...draft, external_id: e.target.value })}
            />
          </label>
        </div>
        <fieldset disabled={!canManage || action.busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>{t('Дополнительные учебные атрибуты')}</legend>
          <p className={s.muted}>
            {t(
              'Например: направление подготовки, квалификация или рабочая площадка. Эти поля не изменяют права доступа.',
            )}
          </p>
          {attributeRows.map((row, index) => (
            <div className={s.formGrid} key={index}>
              <label className={s.field}>
                {t('Название поля')}
                <input
                  required
                  maxLength={80}
                  value={row.key}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      attributeRows: attributeRows.map((item, i) =>
                        i === index ? { ...item, key: event.target.value } : item,
                      ),
                    })
                  }
                />
              </label>
              <label className={s.field}>
                {t('Значение')}
                <input
                  maxLength={2000}
                  value={row.value}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      attributeRows: attributeRows.map((item, i) =>
                        i === index ? { ...item, value: event.target.value } : item,
                      ),
                    })
                  }
                />
              </label>
              {canManage && (
                <button
                  type='button'
                  onClick={() =>
                    setDraft({
                      ...draft,
                      attributeRows: attributeRows.filter((_, i) => i !== index),
                    })
                  }
                >
                  {t('Удалить поле')} {index + 1}
                </button>
              )}
            </div>
          ))}
          {canManage && (
            <button
              type='button'
              className={s.secondary}
              disabled={attributeRows.length >= 50}
              onClick={() =>
                setDraft({
                  ...draft,
                  attributeRows: [...attributeRows, { key: '', value: '' }],
                })
              }
            >
              {t('Добавить поле')}
            </button>
          )}
        </fieldset>
        {canManage && (
          <button className={s.primary} disabled={action.busy}>
            {t('Сохранить карточку')}
          </button>
        )}
        <ActionStatus action={action} />
      </form>
      {canManage && (
        <Roles
          member={member}
          groups={groups}
          departments={departments}
          own={member.id === user?.id}
        />
      )}
    </section>
  );
}

function Roles({
  member,
  groups,
  departments,
  own,
}: {
  member: TeamMember;
  groups: Group[];
  departments: Department[];
  own: boolean;
}) {
  const roleName = useRoleNames();

  const { t } = useLocale();

  const grants = useLearningData<{ role: string; items: RoleGrant[] }>(
    `/team/members/${member.id}/roles`,
  );
  const courses = useLearningData<{
    items: { id: number; title: string; status: string }[];
  }>('/team/course-directory');
  const permission = useLearningData<{ can_manage_admins: boolean }>('/team/permissions');
  const [role, setRole] = useState('author');
  const [scope, setScope] = useState('organization');
  const [scopeId, setScopeId] = useState('');
  const action = useTeamAction();
  const confirmation = useManagementConfirmation();
  const choices =
    scope === 'group'
      ? groups.map((g) => ({ id: g.id, title: g.name }))
      : scope === 'department'
        ? departments.map((g) => ({ id: g.id, title: g.name }))
        : (courses.data?.items ?? []);
  const scopeLabel = (g: RoleGrant) =>
    g.scope_type === 'organization'
      ? t('Вся организация')
      : g.scope_type === 'group'
        ? groups.find((v) => v.id === g.scope_id)?.name
        : g.scope_type === 'department'
          ? departments.find((v) => v.id === g.scope_id)?.name
          : courses.data?.items.find((v) => v.id === g.scope_id)?.title;
  return (
    <div className={s.stack} style={{ marginTop: 28 }}>
      {confirmation.dialog}
      <h3>{t('Права доступа')}</h3>
      <p className={s.muted}>
        {t('Основная роль:') + ' '}
        {roleName(grants.data?.role ?? member.organization_role)}
        {t(
          '. Автор работает с содержанием; проверяющий оценивает работы; руководитель видит результаты в своей области.',
        )}
      </p>
      {!!grants.error && <RequestError error={grants.error} onRetry={() => void grants.reload()} />}{' '}
      {!!courses.error && (
        <RequestError error={courses.error} onRetry={() => void courses.reload()} />
      )}{' '}
      {grants.data?.items.map((g) => (
        <div className={s.spread} key={g.id}>
          <span>
            {roleName(g.role)} · {scopeLabel(g) || `${g.scope_type} ${g.scope_id}`}
          </span>
          <button
            className={s.danger}
            disabled={
              own || action.busy || (g.role === 'admin' && !permission.data?.can_manage_admins)
            }
            onClick={() =>
              confirmation.ask({
                title: t('Отозвать назначение роли'),
                description: t('Отозвать это назначение роли? Сеансы участника будут завершены.'),
                confirmLabel: t('Отозвать'),
                action: () =>
                  action.run(async () => {
                    await api.delete(`/team/members/${member.id}/roles/${g.id}`);
                    await grants.reload();
                  }, t('Роль отозвана')),
              })
            }
          >
            {t('Отозвать')}
          </button>
        </div>
      ))}
      {own ? (
        <p className={s.muted}>
          {t('Собственные права изменяет другой администратор или владелец.')}
        </p>
      ) : (
        <form
          className={s.stack}
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              await api.post(`/team/members/${member.id}/roles`, {
                role,
                scope_type: scope,
                scope_id: scope === 'organization' ? 0 : Number(scopeId),
              });
              await grants.reload();
            }, t('Роль назначена'));
          }}
        >
          <div className={s.formGrid}>
            <label className={s.field}>
              {t('Роль')}
              <select
                value={role}
                onChange={(e) => {
                  const next = e.target.value;
                  setRole(next);
                  setScope(
                    next === 'admin' || next === 'member' || next === 'author'
                      ? 'organization'
                      : 'course',
                  );
                  setScopeId('');
                }}
              >
                {[
                  'author',
                  'reviewer',
                  'manager',
                  'member',
                  ...(permission.data?.can_manage_admins ? ['admin'] : []),
                ].map((r) => (
                  <option key={r} value={r}>
                    {roleName(r)}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              {t('Область')}
              <select
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value);
                  setScopeId('');
                }}
              >
                {(role === 'admin' || role === 'member'
                  ? ['organization']
                  : role === 'author'
                    ? ['organization', 'course']
                    : ['course', 'group', 'department']
                ).map((v) => (
                  <option key={v} value={v}>
                    {
                      {
                        organization: t('Организация'),
                        course: t('Курс'),
                        group: t('Группа'),
                        department: t('Подразделение'),
                      }[v]
                    }
                  </option>
                ))}
              </select>
            </label>
            {scope !== 'organization' && (
              <label className={s.field}>
                {t('Выберите область')}
                <select required value={scopeId} onChange={(e) => setScopeId(e.target.value)}>
                  <option value=''>{t('Выберите…')}</option>
                  {choices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <button
            className={s.primary}
            disabled={action.busy || !member.is_active || (scope !== 'organization' && !scopeId)}
          >
            {t('Назначить роль')}
          </button>
        </form>
      )}
      <ActionStatus action={action} />
    </div>
  );
}
