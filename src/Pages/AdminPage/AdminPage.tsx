import AdminDialog from '@/Components/Admin/AdminDialog';
import AdminToast from '@/Components/Admin/AdminToast';
import { useLocale } from '@/i18n/useLocale';
import { useDurableState } from '@/hooks/useDurableState';
import { readDraft, writeDraft, clearDraft } from '@/shared/drafts';
import DraftNotice from '@/Components/DraftNotice';
import StatusPage from '@/Pages/AccessPage/StatusPage';
import { RequestError, LoadingState } from '@/Components/RequestState';
import { useReconnect } from '@/hooks/useReconnect';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { api } from '@/shared/api';
import {
  Shell,
  CopyLink,
  styles as workspaceStyles,
  dateText,
  statuses,
  type Overview,
} from '@/Pages/Workspace/shared';
import adminStyles from './admin.module.css';
import AdminOverview from './AdminOverview';
import AdminCoursePanel, { type ManagedCourse } from './AdminCoursePanel';
import AdminRequestPanel, { type ManagedRequest } from './AdminRequestPanel';
import {
  ArrowUpRight,
  LayoutDashboard,
  Building2,
  Users,
  MailPlus,
  BookOpen,
  Inbox,
  History,
  Settings2,
  RefreshCw,
} from 'lucide-react';
const styles = { ...workspaceStyles, ...adminStyles };
const tabIcons = {
  overview: LayoutDashboard,
  organizations: Building2,
  users: Users,
  invitations: MailPlus,
  courses: BookOpen,
  requests: Inbox,
  audit: History,
};
export type Organization = {
  id: number;
  name: string;
  kind: string;
  is_active: boolean;
  seat_limit: number;
  course_limit: number;
  source_limit: number;
  generation_limit: number;
  ai_unlimited?: boolean;
  active_users: number;
  reserved_seats: number;
  courses: number;
  state_token?: string;
};
export type Member = {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
  organization_id: number | null;
  organization_role: string;
  organization_name: string | null;
  auth_version?: number;
};
export type Invitation = {
  id: number;
  email: string;
  organization_id: number;
  role: string;
  status: string;
  expires_at: string;
};
type Course = ManagedCourse;
type RequestItem = ManagedRequest;
type EventItem = {
  id: number;
  actor_id: number | null;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
};
type OrgForm = {
  id?: number;
  name: string;
  kind: string;
  is_active: boolean;
  seat_limit: number;
  course_limit: number;
  source_limit: number;
  generation_limit: number;
  ai_unlimited?: boolean;
  state_token?: string;
};
type AdminOverview = Overview & {
  users: number;
  organizations: number;
  open_requests: number;
  unassigned_courses: number;
};
const freshOrg = (): OrgForm => ({
  name: '',
  kind: 'business',
  is_active: true,
  seat_limit: 10,
  course_limit: 50,
  source_limit: 20,
  generation_limit: 100,
  ai_unlimited: false,
});
const roleLabels: Record<string, string> = {
  owner: 'Владелец организации',
  admin: 'Администратор',
  author: 'Автор',
  reviewer: 'Проверяющий',
  manager: 'Руководитель',
  member: 'Участник',
  candidate: 'Кандидат',
};
const companyRoles = { owner: 'Владелец', manager: 'Руководитель', member: 'Сотрудник', candidate: 'Кандидат' };
const rolesForKind = (kind?: string) => Object.entries(kind === 'business' ? companyRoles : roleLabels).filter(([key]) => kind === 'business' || key !== 'candidate');
const kinds: Record<string, string> = {
  business: 'Компания',
  education: 'Образовательная организация',
  government: 'Государственный заказчик',
  individual: 'Индивидуальный заказчик',
};
const tabs = [
  ['overview', 'Обзор'],
  ['organizations', 'Заказчики'],
  ['users', 'Пользователи'],
  ['invitations', 'Приглашения'],
  ['courses', 'Курсы'],
  ['requests', 'Обращения'],
  ['audit', 'Журнал действий'],
];
const eventTitles: Record<string, string> = {
  'organization.archived': 'Приостановлена организация',
  'organization.restored': 'Восстановлена организация',
  'invitation.reissued': 'Перевыпущено приглашение',
  'course.created_by_operator': 'Оператор создал курс',
  'course.metadata_updated': 'Изменены метаданные курса',
  'course.archived': 'Курс архивирован',
  'course.restored': 'Курс восстановлен',
  'request.recorded_by_operator': 'Оператор записал обращение',
  'request.reopened': 'Обращение открыто повторно',
  'request.note_added': 'Добавлен комментарий к обращению',
  'request.archived': 'Обращение архивировано',
  'organization.created': 'Создан заказчик',
  'organization.updated': 'Изменены условия заказчика',
  'user.access_changed': 'Изменён доступ пользователя',
  'user.recovery_issued': 'Выдана ссылка восстановления',
  'invitation.created': 'Создано приглашение',
  'invitation.revoked': 'Отозвано приглашение',
  'invitation.accepted': 'Принято приглашение',
  'course.owner_assigned': 'Назначен владелец курса',
  'request.closed': 'Обработано обращение',
  'administrator.granted': 'Выдан доступ владельца',
};
export default function AdminPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = tabs.some(([k]) => k === params.get('tab')) ? params.get('tab')! : 'overview';
  const [version, setVersion] = useState(0);
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [unassigned, setUnassigned] = useState(false);
  const [archivedCourses, setArchivedCourses] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    explanation: string;
    path: string;
    body: Record<string, unknown>;
  } | null>(null);
  const [latestOrg, setLatestOrg] = useState<Organization | null>(null);
  const [latestUser, setLatestUser] = useState<Member | null>(null);
  const [reissueRoles, setReissueRoles] = useState<Record<number, string>>({});
  const [managementReady, setManagementReady] = useState<boolean | null>(null);
  const [requestStatus, setRequestStatus] = useState('open');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [orgSearch, setOrgSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [orgOptions, setOrgOptions] = useState<Organization[]>([]);
  const [userOptions, setUserOptions] = useState<Member[]>([]);
  const [orgForm, setOrgForm] = useDurableState<OrgForm | null>('admin:organization-form', null);
  const [userForm, setUserForm] = useDurableState<Member | null>('admin:member-form', null);
  const [inviteOrg, setInviteOrg] = useDurableState('admin:invite-organization', '');
  const [inviteEmail, setInviteEmail] = useDurableState('admin:invite-email', '');
  const [inviteRole, setInviteRole] = useDurableState('admin:invite-role', 'member');
  useReconnect(() => setVersion((v) => v + 1));
  useEffect(() => {
    if (!user?.is_admin) return;
    let active = true;
    api
      .get<{ version: number }>('/admin/management-capabilities')
      .then((result) => {
        if (active) setManagementReady(result.data.version === 1);
      })
      .catch(() => {
        if (active) setManagementReady(false);
      });
    return () => {
      active = false;
    };
  }, [version, user?.is_admin]);
  useEffect(() => {
    if (!user?.is_admin) return;
    let active = true;
    Promise.all([
      api.get<{ items: Organization[] }>(
        '/admin/organizations?limit=100&q=' + encodeURIComponent(orgSearch),
      ),
      api.get<{ items: Member[] }>('/admin/users?limit=100&q=' + encodeURIComponent(userSearch)),
    ])
      .then(([o, u]) => {
        if (active) {
          setOrgOptions(o.data.items);
          setUserOptions(u.data.items);
        }
      })
      .catch((e) => {
        if (active) setError(e);
      });
    return () => {
      active = false;
    };
  }, [version, user?.is_admin, orgSearch, userSearch]);
  useEffect(() => {
    if (!user?.is_admin) return;
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const suffix = `?limit=50&offset=${offset}&q=${encodeURIComponent(q)}`;
          if (tab === 'overview') {
            const r = await api.get<AdminOverview>('/admin/overview');
            if (active) {
              setOverview(r.data);
              setTotal(0);
            }
          }
          if (tab === 'organizations') {
            const r = await api.get<{ items: Organization[]; total: number }>(
              '/admin/organizations' + suffix,
            );
            if (active) {
              setOrganizations(r.data.items);
              setTotal(r.data.total);
            }
          }
          if (tab === 'users') {
            const r = await api.get<{ items: Member[]; total: number }>('/admin/users' + suffix);
            if (active) {
              setUsers(r.data.items);
              setTotal(r.data.total);
            }
          }
          if (tab === 'invitations') {
            const r = await api.get<{ items: Invitation[]; total: number }>(
              '/admin/invitations' + suffix,
            );
            if (active) {
              setInvites(r.data.items);
              setTotal(r.data.total);
            }
          }
          if (tab === 'courses') {
            const r = await api.get<{ items: Course[]; total: number }>(
              '/admin/courses' + suffix + `&unassigned=${unassigned}&archived=${archivedCourses}`,
            );
            if (active) {
              setCourses(r.data.items);
              setTotal(r.data.total);
            }
          }
          if (tab === 'requests') {
            const r = await api.get<{ items: RequestItem[]; total: number }>(
              '/admin/requests' + suffix + `&status=${requestStatus}`,
            );
            if (active) {
              setRequests(r.data.items);
              setTotal(r.data.total);
            }
          }
          if (tab === 'audit') {
            const r = await api.get<{ items: EventItem[]; total: number }>('/admin/audit' + suffix);
            if (active) {
              setEvents(r.data.items);
              setTotal(r.data.total);
            }
          }
          if (active) setError(null);
        } catch (e) {
          if (active) setError(e);
        } finally {
          if (active) setLoading(false);
        }
      })();
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [tab, version, q, offset, unassigned, archivedCourses, requestStatus, user?.is_admin]);
  async function perform(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage('');
    try {
      await action();
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  function switchTab(next: string) {
    setParams({ tab: next });
    setQ('');
    setOffset(0);
    setLink('');
    setMessage('');
    setOrgSearch('');
    setUserSearch('');
  }
  function openOrgForm(next: OrgForm) {
    if (orgForm)
      writeDraft(`admin:org:${orgForm.id ?? 'new'}`, orgForm, undefined, user?.id ?? null);
    setOrgForm(
      readDraft<OrgForm>(`admin:org:${next.id ?? 'new'}`, user?.id ?? null)?.value ?? next,
    );
  }
  function openUserForm(next: Member) {
    if (userForm) writeDraft(`admin:user:${userForm.id}`, userForm, undefined, user?.id ?? null);
    setUserForm(readDraft<Member>(`admin:user:${next.id}`, user?.id ?? null)?.value ?? next);
  }
  function saveOrg(e: FormEvent) {
    e.preventDefault();
    if (!orgForm) return;
    if (orgForm.id && (!orgForm.state_token || !managementReady)) return;
    void perform(async () => {
      const { id, state_token, ...body } = orgForm;
      if (id)
        await api.put(`/admin/organizations/${id}`, {
          ...body,
          expected_state: state_token,
        });
      else await api.post('/admin/organizations', body);
      clearDraft(`admin:org:${orgForm.id ?? 'new'}`, orgForm, user?.id ?? null);
      setMessage(
        id
          ? t('Условия заказчика сохранены.')
          : t('Заказчик создан. Теперь можно пригласить его администратора.'),
      );
      setOrgForm(null);
    });
  }
  function saveUser(e: FormEvent) {
    e.preventDefault();
    if (!userForm) return;
    if (userForm.auth_version == null || !managementReady) return;
    void perform(async () => {
      await api.put(`/admin/users/${userForm.id}`, {
        is_active: userForm.is_active,
        organization_id: userForm.organization_id,
        organization_role: userForm.organization_role,
        full_name: userForm.full_name || undefined,
        expected_auth_version: userForm.auth_version,
      });
      clearDraft(`admin:user:${userForm.id}`, userForm, user?.id ?? null);
      setMessage(t('Доступ сохранён. Предыдущие сеансы пользователя завершены.'));
      setUserForm(null);
    });
  }
  function createInvite(e: FormEvent) {
    e.preventDefault();
    void perform(async () => {
      const r = await api.post<{ url: string; mail_status: string }>('/admin/invitations', {
        email: inviteEmail,
        organization_id: Number(inviteOrg),
        role: inviteRole,
        locale,
      });
      setLink(r.data.url);
      setLinkTitle(t('Приглашение готово · действует 7 дней'));
      setInviteEmail('');
      setInviteOpen(false);
      setMessage(
        r.data.mail_status === 'queued'
          ? t('Ссылка создана, письмо поставлено в очередь доставки.')
          : t('Ссылка создана. Почта пока не настроена: передайте ссылку адресату лично.'),
      );
    });
  }
  if (!user?.is_admin)
    return (
      <StatusPage
        code='403'
        title={t('Доступ заблокирован')}
        description={t(
          'У вашего аккаунта нет прав на управление платформой. Перейдите в рабочее пространство или обратитесь к администратору организации.',
        )}
      />
    );
  return (
    <Shell
      title={t('Управление Лерниумом')}
      description={t('Заказчики, доступ, ограничения и обращения в одном месте.')}
      action={
        <button
          className={styles.secondary}
          onClick={() => setVersion((v) => v + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden='true' />
          {t('Обновить данные')}
        </button>
      }
    >
      <fieldset disabled={busy} className={styles.layout}>
        <aside className={styles.navigation}>
          <div className={styles.navigationTitle}>{t('Управление платформой')}</div>
          <div
            className={styles.tabs}
            role='tablist'
            aria-label={t('Разделы админки')}
            onKeyDown={(event) => {
              const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'];
              if (!keys.includes(event.key)) return;
              event.preventDefault();
              const index = tabs.findIndex(([key]) => key === tab);
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : (index +
                        (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1) +
                        tabs.length) %
                      tabs.length;
              switchTab(tabs[next][0]);
              const controls =
                event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
              controls[next]?.focus();
            }}
          >
            {tabs.map(([key, label]) => {
              const Icon = tabIcons[key as keyof typeof tabIcons];
              return (
                <button
                  key={key}
                  id={`admin-tab-${key}`}
                  role='tab'
                  aria-selected={tab === key}
                  aria-controls='admin-content'
                  tabIndex={tab === key ? 0 : -1}
                  onClick={() => switchTab(key)}
                >
                  <Icon size={18} aria-hidden='true' />
                  {t(label)}
                  <ArrowUpRight size={16} aria-hidden='true' />
                </button>
              );
            })}
          </div>
          <Link className={styles.operationsLink} to='/admin/operations'>
            <Settings2 size={18} aria-hidden='true' />
            {t('Состояние установки и доставки')}
            <ArrowUpRight size={16} aria-hidden='true' />
          </Link>
        </aside>
        <div
          id='admin-content'
          role='tabpanel'
          aria-labelledby={`admin-tab-${tab}`}
          className={styles.content}
        >
          <DraftNotice />
          {managementReady === false && (
            <p role='status'>
              {t(
                'Сервер ещё не поддерживает новые действия админки или временно недоступен. Обновите данные после завершения обновления. Черновики сохранены.',
              )}
            </p>
          )}
          {confirmAction && (
            <AdminDialog
              title={confirmAction.title}
              onClose={() => setConfirmAction(null)}
              busy={busy}
              className={styles.dialogScope}
            >
              {!!error && <RequestError error={error} />}
              <section className={styles.panel} aria-label={t('Подтверждение действия')}>
                <p>{confirmAction.explanation}</p>
                <div className={styles.row}>
                  <button
                    className={styles.primary}
                    disabled={busy || !managementReady}
                    onClick={() =>
                      void perform(async () => {
                        await api.post(confirmAction.path, confirmAction.body);
                        setConfirmAction(null);
                        setMessage(t('Состояние изменено. История сохранена.'));
                      })
                    }
                  >
                    {t('Подтвердить')}
                  </button>
                  <button className={styles.secondary} onClick={() => setConfirmAction(null)}>
                    {t('Отмена')}
                  </button>
                </div>
              </section>
            </AdminDialog>
          )}
          {!!error &&
            !confirmAction &&
            !(tab === 'organizations' && orgForm) &&
            !(tab === 'users' && userForm) &&
            !inviteOpen && <RequestError error={error} onRetry={() => setVersion((v) => v + 1)} />}
          <AdminToast message={message} onClose={() => setMessage('')} />
          {link && (
            <AdminDialog
              title={linkTitle || t('Приглашение готово')}
              onClose={() => setLink('')}
              className={styles.dialogScope}
            >
              <CopyLink key={link} url={link} title={linkTitle} />
            </AdminDialog>
          )}
          {tab === 'overview' && overview && (
            <AdminOverview
              data={overview}
              onNavigate={(next, onlyUnassigned) => {
                switchTab(next);
                if (onlyUnassigned) setUnassigned(true);
              }}
            />
          )}
          {(tab === 'organizations' || tab === 'users') && (
            <div className={styles.between}>
              <label className={styles.search}>
                {t('Поиск')}
                <input
                  type='search'
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setOffset(0);
                  }}
                  placeholder={tab === 'users' ? t('Имя или email') : t('Название заказчика')}
                />
              </label>
              {tab === 'organizations' && (
                <button className={styles.primary} onClick={() => openOrgForm(freshOrg())}>
                  {t('Добавить заказчика +')}
                </button>
              )}
              {tab === 'users' && (
                <button
                  className={styles.primary}
                  onClick={() => {
                    switchTab('invitations');
                    setInviteOpen(true);
                  }}
                >
                  {t('Создать через приглашение')}
                </button>
              )}
            </div>
          )}
          {tab === 'organizations' && orgForm && (
            <AdminDialog
              title={orgForm.id ? t('Условия заказчика') : t('Новый заказчик')}
              onClose={() => setOrgForm(null)}
              busy={busy}
              guard
              className={styles.dialogScope}
            >
              {!!error && <RequestError error={error} />}
              <section className={styles.panel}>
                <form className={styles.form} onSubmit={saveOrg}>
                  {(!!error || !orgForm.state_token) && orgForm.id && managementReady && (
                    <button
                      type='button'
                      className={styles.secondary}
                      onClick={() =>
                        void perform(async () => {
                          const result = await api.get<Organization>(
                            `/admin/organizations/${orgForm.id}`,
                          );
                          setLatestOrg(result.data);
                        })
                      }
                    >
                      {t('Сравнить с текущей записью')}
                    </button>
                  )}
                  {latestOrg && latestOrg.id === orgForm.id && (
                    <section className={styles.span}>
                      <h3>{t('Текущая запись на сервере')}</h3>
                      <p>
                        {latestOrg.name} ·{' '}
                        {t(latestOrg.is_active ? 'Доступ включён' : 'Приостановлен')}
                      </p>
                      <p>
                        {t('Участники и приглашения:')} {latestOrg.seat_limit} · {t('Курсы:')}{' '}
                        {latestOrg.course_limit} · {t('Источников на курс:')}{' '}
                        {latestOrg.source_limit} · {t('Генераций в месяц:')}{' '}
                        {latestOrg.generation_limit}
                      </p>
                      <button
                        type='button'
                        className={styles.secondary}
                        onClick={() => {
                          setOrgForm({
                            ...orgForm,
                            state_token: latestOrg.state_token,
                          });
                          setLatestOrg(null);
                        }}
                      >
                        {t('Сохранить мои поля поверх этой версии')}
                      </button>
                      <p>{t('Затем нажмите сохранение. Ваш введённый текст останется в форме.')}</p>
                    </section>
                  )}
                  <label>
                    {t('Название')}
                    <input
                      required
                      minLength={2}
                      maxLength={200}
                      value={orgForm.name}
                      onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    />
                  </label>
                  <label>
                    {t('Тип')}
                    <select
                      value={orgForm.kind}
                      onChange={(e) => setOrgForm({ ...orgForm, kind: e.target.value })}
                    >
                      {Object.entries(kinds).map(([k, v]) => (
                        <option key={k} value={k}>
                          {t(v)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {(
                    [
                      ['seat_limit', t('Участников, включая приглашения')],
                      ['course_limit', t('Курсов в организации')],
                      ['source_limit', t('Источников на один курс')],
                      ['generation_limit', t('Запусков генерации в месяц')],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        type='number'
                        required
                        min={key === 'generation_limit' ? 0 : 1}
                        max={key === 'source_limit' ? 1000 : 100000}
                        disabled={Boolean(orgForm.ai_unlimited) && key !== 'seat_limit'}
                        value={orgForm[key]}
                        onChange={(e) =>
                          setOrgForm({
                            ...orgForm,
                            [key]: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  ))}
                  <label className={styles.check}>
                    <input type='checkbox' checked={Boolean(orgForm.ai_unlimited)}
                      onChange={(e) => setOrgForm({ ...orgForm, ai_unlimited: e.target.checked })} />
                    {t('Без квот на генерации и ИИ')}
                  </label>
                  {orgForm.ai_unlimited && <p>{t('Курсы, источники, генерации и запросы к ИИ без продуктовых квот. Расход учитывается. Одновременная нагрузка и размер файлов ограничены возможностями сервера.')}</p>}
                  <label className={styles.check}>
                    <input
                      type='checkbox'
                      checked={orgForm.is_active}
                      onChange={(e) => setOrgForm({ ...orgForm, is_active: e.target.checked })}
                    />
                    {t('Доступ организации включён')}
                  </label>
                  <p className={styles.span}>
                    {t(
                      'При снижении лимита существующие данные сохраняются, новые операции сверх лимита блокируются. Приостановка доступа запрещает вход участникам. Месячный лимит учитывает новые запуски, включая неудачные; продолжение приостановленного запуска не расходует новое место.',
                    )}
                  </p>
                  <div className={styles.row}>
                    <button
                      className={styles.primary}
                      disabled={
                        busy || (!!orgForm.id && (!orgForm.state_token || !managementReady))
                      }
                    >
                      {t('Сохранить заказчика')}
                    </button>
                    <button
                      type='button'
                      data-dialog-close
                      className={styles.secondary}
                      onClick={() => setOrgForm(null)}
                    >
                      {t('Отмена')}
                    </button>
                  </div>
                </form>
              </section>
            </AdminDialog>
          )}
          {tab === 'organizations' && !loading && (
            <div className={styles.grid}>
              {organizations.map((o) => (
                <article className={styles.card} key={o.id}>
                  <Link
                    className={styles.cardAction}
                    to={`/admin/organizations/${o.id}/delivery`}
                    aria-label={`${o.name} · ${t('Функции и профиль')}`}
                  >
                    <ArrowUpRight size={24} aria-hidden='true' />
                  </Link>
                  <span className={styles.badge}>
                    {o.is_active ? t('Доступ включён') : t('Приостановлен')}
                  </span>
                  <h2>{o.name}</h2>
                  <p>
                    {t(kinds[o.kind] ?? o.kind)} · №{o.id}
                  </p>
                  <dl className={styles.quotaList}>
                    <div>
                      <dt>{t('Участники и приглашения:')}</dt>
                      <dd>
                        {o.reserved_seats} <span>/ {o.seat_limit}</span>
                      </dd>
                      <progress
                        value={Math.min(o.reserved_seats, o.seat_limit)}
                        max={o.seat_limit}
                        aria-label={t('Участники и приглашения:')}
                      />
                    </div>
                    <div>
                      <dt>{t('Курсы:')}</dt>
                      <dd>
                        {o.courses} <span>/ {o.ai_unlimited ? t('Без лимита') : o.course_limit}</span>
                      </dd>
                      {!o.ai_unlimited && <progress
                        value={Math.min(o.courses, o.course_limit)}
                        max={o.course_limit}
                        aria-label={t('Курсы:')}
                      />}
                    </div>
                    <div>
                      <dt>{t('Источников на курс:')}</dt>
                      <dd>{o.ai_unlimited ? t('Без лимита') : o.source_limit}</dd>
                    </div>
                    <div>
                      <dt>{t('Генераций в месяц:')}</dt>
                      <dd>{o.ai_unlimited ? t('Без лимита') : o.generation_limit}</dd>
                    </div>
                  </dl>
                  <div className={styles.row}>
                    <button
                      className={styles.secondary}
                      onClick={() =>
                        openOrgForm({
                          id: o.id,
                          name: o.name,
                          kind: o.kind,
                          is_active: o.is_active,
                          seat_limit: o.seat_limit,
                          course_limit: o.course_limit,
                          source_limit: o.source_limit,
                          generation_limit: o.generation_limit,
                          ai_unlimited: Boolean(o.ai_unlimited),
                          state_token: o.state_token,
                        })
                      }
                    >
                      {t('Настроить лимиты')}
                    </button>
                    <button
                      className={o.is_active ? styles.danger : styles.secondary}
                      disabled={!managementReady || !o.state_token}
                      onClick={() =>
                        setConfirmAction({
                          title: `${t(o.is_active ? 'Приостановить организацию?' : 'Восстановить организацию?')} ${o.name}`,
                          explanation: t(
                            'Участники, курсы и история сохранятся. Приостановленная организация не сможет работать до восстановления.',
                          ),
                          path: `/admin/organizations/${o.id}/${o.is_active ? 'archive' : 'restore'}`,
                          body: { expected_state: o.state_token },
                        })
                      }
                    >
                      {t(o.is_active ? 'Приостановить' : 'Восстановить')}
                    </button>
                    <Link className={styles.secondary} to={`/admin/organizations/${o.id}/delivery`}>
                      {t('Функции и профиль')}
                    </Link>
                    <Link className={styles.secondary} to={`/admin/organizations/${o.id}/billing`}>
                      {t('Договор и счета')}
                    </Link>
                    <button
                      className={styles.primary}
                      disabled={!o.is_active}
                      onClick={() => {
                        switchTab('invitations');
                        setInviteOpen(true);
                        setInviteOrg(String(o.id));
                        setInviteRole('owner');
                      }}
                    >
                      {t('Пригласить владельца')}
                    </button>
                  </div>
                </article>
              ))}
              {!organizations.length && (
                <div className={styles.empty}>
                  {t('Заказчики не найдены. Добавьте первого или измените поиск.')}
                </div>
              )}
            </div>
          )}
          {tab === 'users' && userForm && (
            <AdminDialog
              title={`${t('Доступ:')} ${userForm.email}`}
              onClose={() => setUserForm(null)}
              busy={busy}
              guard
              className={styles.dialogScope}
            >
              {!!error && <RequestError error={error} />}
              <section className={styles.panel}>
                <form className={styles.form} onSubmit={saveUser}>
                  {(!!error || userForm.auth_version == null) && managementReady && (
                    <button
                      type='button'
                      className={styles.secondary}
                      onClick={() =>
                        void perform(async () => {
                          const result = await api.get<Member>(`/admin/users/${userForm.id}`);
                          setLatestUser(result.data);
                        })
                      }
                    >
                      {t('Сравнить с текущей записью')}
                    </button>
                  )}
                  {latestUser?.id === userForm.id && (
                    <section className={styles.span}>
                      <h3>{t('Текущая запись на сервере')}</h3>
                      <p>
                        {latestUser.full_name} ·{' '}
                        {latestUser.organization_name || t('Личный аккаунт')} ·{' '}
                        {t(
                          roleLabels[latestUser.organization_role] ?? latestUser.organization_role,
                        )}{' '}
                        · {t(latestUser.is_active ? 'Активен' : 'Отключён')}
                      </p>
                      <button
                        type='button'
                        className={styles.secondary}
                        onClick={() => {
                          setUserForm({
                            ...userForm,
                            auth_version: latestUser.auth_version,
                          });
                          setLatestUser(null);
                        }}
                      >
                        {t('Сохранить мои поля поверх этой версии')}
                      </button>
                      <p>{t('Затем нажмите сохранение. Ваш введённый текст останется в форме.')}</p>
                    </section>
                  )}
                  <label>
                    {t('Имя пользователя')}
                    <input
                      required
                      maxLength={160}
                      value={userForm.full_name}
                      onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                    />
                  </label>
                  <label>
                    {t('Поиск организации')}
                    <input
                      type='search'
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      placeholder={t('Найти по названию')}
                    />
                  </label>
                  <label>
                    {t('Организация')}
                    <select
                      value={userForm.organization_id ?? ''}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          organization_id: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    >
                      <option value=''>{t('Личный аккаунт')}</option>
                      {orgOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t('Роль в организации')}
                    <select
                      value={userForm.organization_role}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          organization_role: e.target.value,
                        })
                      }
                    >
                      {rolesForKind(orgOptions.find(o => o.id === userForm.organization_id)?.kind).map(([key, label]) => <option key={key} value={key} disabled={key === 'owner' && users.find(item => item.id === userForm.id)?.organization_role !== 'owner'}>{t(label)}</option>)}
                    </select>
                  </label>
                  <label className={styles.check}>
                    <input
                      type='checkbox'
                      checked={userForm.is_active}
                      onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                    />
                    {t('Аккаунт активен')}
                  </label>
                  <p className={styles.span}>
                    {t(
                      'Изменение доступа завершит предыдущие сеансы. Курсы остаются в исходном пространстве. Перевод человека не переносит материалы другой организации.',
                    )}
                  </p>
                  <div className={styles.row}>
                    <button
                      className={styles.primary}
                      disabled={busy || userForm.auth_version == null || !managementReady}
                    >
                      {t('Сохранить доступ')}
                    </button>
                    <button
                      type='button'
                      data-dialog-close
                      className={styles.secondary}
                      onClick={() => setUserForm(null)}
                    >
                      {t('Отмена')}
                    </button>
                  </div>
                </form>
              </section>
            </AdminDialog>
          )}
          {tab === 'users' && !loading && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('Пользователь')}</th>
                    <th>{t('Организация')}</th>
                    <th>{t('Роль и доступ')}</th>
                    <th>{t('Действия')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        {u.full_name || t('Без имени')}
                        <small>
                          {u.email} · №{u.id}
                        </small>
                      </td>
                      <td>{u.organization_name || t('Личный аккаунт')}</td>
                      <td>
                        {u.is_admin
                          ? t('Администратор Лерниума')
                          : t(roleLabels[u.organization_role] ?? u.organization_role)}
                        <small>{u.is_active ? t('Активен') : t('Отключён')}</small>
                      </td>
                      <td>
                        {u.is_admin ? (
                          <span className={styles.muted}>{t('Защищённый аккаунт')}</span>
                        ) : (
                          <div className={styles.row}>
                            <button className={styles.secondary} onClick={() => openUserForm(u)}>
                              {t('Изменить доступ')}
                            </button>
                            <button
                              className={u.is_active ? styles.danger : styles.secondary}
                              disabled={!managementReady || u.auth_version == null}
                              onClick={() =>
                                setConfirmAction({
                                  title: `${t(u.is_active ? 'Отключить пользователя?' : 'Восстановить пользователя?')} ${u.email}`,
                                  explanation: t(
                                    'Курсы, ответы и история сохранятся. Отключение завершает сеансы; восстановление проверяет доступные места.',
                                  ),
                                  path: `/admin/users/${u.id}/${u.is_active ? 'archive' : 'restore'}`,
                                  body: {
                                    expected_auth_version: u.auth_version,
                                  },
                                })
                              }
                            >
                              {t(u.is_active ? 'Отключить' : 'Восстановить')}
                            </button>
                            <button
                              className={styles.secondary}
                              disabled={busy || !u.is_active}
                              onClick={() =>
                                void perform(async () => {
                                  const r = await api.post<{ url: string }>(
                                    `/admin/users/${u.id}/recovery-link`,
                                  );
                                  setLink(r.data.url);
                                  setLinkTitle(
                                    t('Восстановление для {v0} · 30 минут', {
                                      v0: u.email,
                                    }),
                                  );
                                })
                              }
                            >
                              {t('Восстановить доступ')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!users.length && <p style={{ padding: 20 }}>{t('Пользователи не найдены.')}</p>}
            </div>
          )}
          {tab === 'invitations' && (
            <>
              <div className={styles.between}>
                <div>
                  <h2>{t('Приглашения')}</h2>
                  <p>{t('Выдавайте доступ и следите за принятием приглашений.')}</p>
                </div>
                <button className={styles.primary} onClick={() => setInviteOpen(true)}>
                  {t('Пригласить пользователя')}
                </button>
              </div>
              {inviteOpen && (
                <AdminDialog
                  title={t('Пригласить нового пользователя')}
                  onClose={() => setInviteOpen(false)}
                  busy={busy}
                  guard
                  className={styles.dialogScope}
                >
                  {!!error && <RequestError error={error} />}
                  <section className={styles.panel}>
                    <p>
                      {t(
                        'Аккаунт создаётся после принятия приглашения. Ссылка доступна сразу; очередь письма не означает подтверждённую доставку.',
                      )}
                    </p>
                    <form className={styles.form} onSubmit={createInvite}>
                      <label>
                        {t('Поиск организации')}
                        <input
                          type='search'
                          value={orgSearch}
                          onChange={(e) => setOrgSearch(e.target.value)}
                          placeholder={t('Найти по названию')}
                        />
                      </label>
                      <label>
                        {t('Организация')}
                        <select
                          required
                          value={inviteOrg}
                          onChange={(e) => { setInviteOrg(e.target.value); setInviteRole('member'); }}
                        >
                          <option value=''>{t('Выберите заказчика')}</option>
                          {orgOptions
                            .filter((o) => o.is_active)
                            .map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Email
                        <input
                          required
                          type='email'
                          maxLength={255}
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </label>
                      <label>
                        {t('Роль')}
                        <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                          {rolesForKind(orgOptions.find(o => o.id === Number(inviteOrg))?.kind).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}
                        </select>
                      </label>
                      <button className={styles.primary} disabled={busy}>
                        {t('Создать приглашение')}
                      </button>
                    </form>
                    <p>
                      {t(
                        'Приглашения резервируют места. Пользователь личного аккаунта может принять приглашение после входа. Аккаунт другой организации сначала завершает прежнее членство.',
                      )}
                    </p>
                  </section>
                </AdminDialog>
              )}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>{t('Организация')}</th>
                      <th>{t('Роль')}</th>
                      <th>{t('Состояние')}</th>
                      <th>{t('Действие')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((i) => (
                      <tr key={i.id}>
                        <td>{i.email}</td>
                        <td>
                          {orgOptions.find((o) => o.id === i.organization_id)?.name ||
                            `№${i.organization_id}`}
                        </td>
                        <td>{t(roleLabels[i.role] ?? i.role)}</td>
                        <td>
                          {t(statuses[i.status] ?? i.status)}
                          <small>
                            {t('До')} {dateText(i.expires_at)}
                          </small>
                        </td>
                        <td>
                          {i.status === 'pending' && (
                            <button
                              className={styles.danger}
                              disabled={busy}
                              onClick={() =>
                                void perform(async () => {
                                  await api.delete(`/admin/invitations/${i.id}`);
                                  setMessage(t('Приглашение отозвано.'));
                                })
                              }
                            >
                              {t('Отозвать')}
                            </button>
                          )}
                          {i.status !== 'accepted' && (
                            <>
                              <label>
                                {t('Роль нового приглашения')}
                                <select
                                  value={reissueRoles[i.id] ?? i.role}
                                  onChange={(event) =>
                                    setReissueRoles({
                                      ...reissueRoles,
                                      [i.id]: event.target.value,
                                    })
                                  }
                                >
                                  {rolesForKind(orgOptions.find(o => o.id === i.organization_id)?.kind).map(([key, value]) => (
                                    <option key={key} value={key}>
                                      {t(value)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button
                                className={styles.secondary}
                                disabled={busy || !managementReady}
                                onClick={() =>
                                  void perform(async () => {
                                    const result = await api.post<{
                                      url: string;
                                      mail_status: string;
                                    }>(`/admin/invitations/${i.id}/resend`, {
                                      locale,
                                      role: reissueRoles[i.id] ?? i.role,
                                    });
                                    setLink(result.data.url);
                                    setLinkTitle(t('Новое приглашение · прежняя ссылка отозвана'));
                                    setMessage(
                                      result.data.mail_status === 'queued'
                                        ? t('Ссылка создана, письмо поставлено в очередь доставки.')
                                        : t(
                                            'Ссылка создана. Почта пока не настроена: передайте ссылку адресату лично.',
                                          ),
                                    );
                                  })
                                }
                              >
                                {t('Выдать новую ссылку')}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!invites.length && !loading && (
                  <p style={{ padding: 20 }}>{t('Приглашений пока нет.')}</p>
                )}
              </div>
            </>
          )}
          {tab === 'courses' && (
            <>
              <AdminCoursePanel
                filters={
                  <label className={styles.check}>
                    <input
                      type='checkbox'
                      checked={unassigned}
                      onChange={(e) => {
                        setUnassigned(e.target.checked);
                        setOffset(0);
                      }}
                    />
                    {t('Только без владельца')}
                  </label>
                }
                capable={managementReady === true}
                courses={courses}
                users={userOptions}
                archived={archivedCourses}
                setArchived={(value) => {
                  setArchivedCourses(value);
                  setOffset(0);
                }}
                onChanged={() => setVersion((v) => v + 1)}
                userSearch={userSearch}
                setUserSearch={setUserSearch}
              />
            </>
          )}
          {tab === 'requests' && (
            <AdminRequestPanel
              capable={managementReady === true}
              requests={requests}
              status={requestStatus}
              setStatus={(value) => {
                setRequestStatus(value);
                setOffset(0);
              }}
              onChanged={() => setVersion((v) => v + 1)}
              loading={loading}
            />
          )}
          {tab === 'audit' && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('Когда')}</th>
                    <th>{t('Кто')}</th>
                    <th>{t('Действие')}</th>
                    <th>{t('Объект')}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td>{dateText(e.created_at)}</td>
                      <td>
                        {e.actor_id
                          ? userOptions.find((u) => u.id === e.actor_id)?.email ||
                            t('Пользователь №{v0}', { v0: e.actor_id })
                          : t('Система')}
                      </td>
                      <td>{t(eventTitles[e.action] || e.action)}</td>
                      <td>
                        {e.target_type} №{e.target_id}
                        <details>
                          <summary>{t('Подробности')}</summary>
                          <pre>{JSON.stringify(e.details, null, 2)}</pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!events.length && !loading && (
                <p style={{ padding: 20 }}>{t('Действий пока нет.')}</p>
              )}
            </div>
          )}
          {loading && <LoadingState>{t('Загружаем данные…')}</LoadingState>}
          {total > 0 && (
            <div className={styles.between}>
              <span className={styles.muted}>
                {t('Всего:')} {total} {t('· показаны')} {offset + 1}–{Math.min(offset + 50, total)}
              </span>
              <div className={styles.row}>
                <button
                  className={styles.secondary}
                  disabled={offset === 0 || loading}
                  onClick={() => setOffset((v) => Math.max(0, v - 50))}
                >
                  {t('Назад')}
                </button>
                <button
                  className={styles.secondary}
                  disabled={offset + 50 >= total || loading}
                  onClick={() => setOffset((v) => v + 50)}
                >
                  {t('Далее')}
                </button>
              </div>
            </div>
          )}
        </div>
      </fieldset>
    </Shell>
  );
}
