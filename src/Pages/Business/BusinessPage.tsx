import { createContext, useContext, useState, type FormEvent, type ReactNode } from 'react';
import { useDurableState } from '@/hooks/useDurableState';
import BusinessDialog from '@/Components/Admin/AdminDialog';
import Toast from '@/Components/Admin/AdminToast';
import { useRoleNames } from '../TeamLearning/useRoleNames';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Plus,
  BriefcaseBusiness,
  ArrowUpRight,
  ArrowLeft,
  MoreHorizontal,
  FileText,
  Search,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useLocale } from '@/i18n/useLocale';
import { api } from '@/shared/api';
import { Shell, CopyLink, styles, errorText, statuses } from '../Workspace/shared';
import { useLearningData } from '../Learning/useLearningData';
import { LoadingState } from '@/Components/RequestState';
import StatusPage from '../AccessPage/StatusPage';
import EntityEditor, { type EditableEntity } from '@/Components/CourseEditPage/EntityEditor';
import { RequestError } from '@/Components/RequestState';
import css from './business.module.css';
import BusinessDashboard, { type BusinessOverview } from './BusinessDashboard';

type Page<T> = { items: T[]; total: number };
type Position = {
  id: number;
  name: string;
  description: string;
  responsibilities: string;
  competencies: string;
  revision: number;
  is_archived: boolean;
  employee_count: number;
  candidate_count?: number;
  course_count: number;
};
type Employee = {
  id: number;
  full_name: string;
  email: string | null;
  username?: string | null;
  organization_role: string;
  is_active: boolean;
  auth_version: number;
  position_id: number | null;
  position_name?: string;
  manager_id: number | null;
};
type Invitation = { id: number; email: string; role: string; position_id: number | null };
type Course = {
  id: number;
  name: string;
  description?: string;
  content_revision: number;
  status: string;
  publication_status: string;
};
const blankPosition = { name: '', description: '', responsibilities: '', competencies: '' };

function Pager({
  offset,
  total,
  onChange,
}: {
  offset: number;
  total: number;
  onChange: (offset: number) => void;
}) {
  const { t } = useLocale();
  if (total <= 20) return null;
  return (
    <div className={css.actions}>
      <button className={styles.secondary} disabled={!offset} onClick={() => onChange(offset - 20)}>
        {t('Назад')}
      </button>
      <span>
        {offset + 1}–{Math.min(offset + 20, total)} / {total}
      </span>
      <button
        className={styles.secondary}
        disabled={offset + 20 >= total}
        onClick={() => onChange(offset + 20)}
      >
        {t('Далее')}
      </button>
    </div>
  );
}

export default function BusinessPage() {
  const { positionId } = useParams();
  const { user } = useAuth();
  if (
    user?.organization_kind !== 'business' ||
    !['owner', 'admin', 'manager'].includes(user.organization_role ?? '')
  )
    return <StatusPage code='403' title='Действие доступно управляющему компании' />;
  return (
    <PositionOptionsProvider key={`${user.id}:${user.organization_id}`}>
      <>{positionId ? <PositionScreen positionId={Number(positionId)} /> : <CompanyWorkspace />}</>
    </PositionOptionsProvider>
  );
}

function CompanyWorkspace() {
  const { user } = useAuth();
  const roleName = useRoleNames();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const owner = user?.organization_role === 'owner';
  const requestedTab = params.get('tab') ?? (owner ? 'overview' : 'positions');
  const tab = ['positions', 'employees', 'candidates', ...(owner ? ['managers'] : [])].includes(
    requestedTab,
  )
    ? requestedTab
    : 'overview';
  const setTab = (value: string) => {
    setEmployeeOffset(0);
    setSearch('');
    setParams({ tab: value });
  };
  const memberRole = tab === 'candidates' ? 'candidate' : tab === 'managers' ? 'manager' : 'member';
  const managerFilter = owner ? (params.get('manager_id') ?? '') : '';
  const [archived, setArchived] = useState(false);
  const [positionOffset, setPositionOffset] = useState(0);
  const [employeeOffset, setEmployeeOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [managing, setManaging] = useState<number | null>(null);
  const [editing, setEditing] = useState<Position | 'new' | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [accountMode, setAccountMode] = useState<'login' | 'email'>('login');
  const [loginName, setLoginName] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  function closeInvitation() {
    setInviteOpen(false);
    setInitialPassword('');
  }
  const [invite, setInvite, clearInvite] = useDurableState('business-invitation', {
    email: '',
    role: 'member',
    position_id: '',
    manager_id: '',
  });
  const [invitationLink, setInvitationLink] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ label: string; action: () => Promise<void> } | null>(
    null,
  );
  const positions = useLearningData<Page<Position>>(
    `/business/positions?archived=${archived}&offset=${positionOffset}&limit=20`,
  );
  const employees = useLearningData<Page<Employee>>(
    `/business/employees?offset=${employeeOffset}&limit=20&q=${encodeURIComponent(search)}&role=${memberRole}${managerFilter ? `&manager_id=${encodeURIComponent(managerFilter)}` : ''}`,
  );
  const invitations = useLearningData<{ items: Invitation[] }>('/business/invitations');
  const overview = useLearningData<BusinessOverview>('/business/dashboard');
  const person = employees.data?.items.find((item) => item.id === managing);
  const options = useContext(PositionOptionsContext)!;
  const refresh = async () => {
    await Promise.all([
      positions.reload(),
      employees.reload(),
      invitations.reload(),
      options.query.reload(),
      overview.reload(),
    ]);
  };
  async function mutate(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      await refresh();
      setConfirm(null);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  }
  function confirmPerson(value: { label: string; action: () => Promise<void> }) {
    setManaging(null);
    setError('');
    setConfirm(value);
  }
  async function sendInvite(event: FormEvent) {
    event.preventDefault();
    await mutate(async () => {
      if (accountMode === 'login') {
        const { data } = await api.post<Employee>('/business/employees', {
          full_name: employeeName,
          username: loginName,
          password: initialPassword,
          role: invite.role,
          position_id:
            invite.role !== 'manager' && invite.position_id ? Number(invite.position_id) : null,
          manager_id:
            owner && invite.role !== 'manager' && invite.manager_id
              ? Number(invite.manager_id)
              : null,
        });
        closeInvitation();
        setLoginName('');
        setEmployeeName('');
        clearInvite({ email: '', role: 'member', position_id: '', manager_id: '' });
        setMessage(
          t('Аккаунт создан. Передайте сотруднику логин {login} и заданный пароль.', {
            login: data.username ?? loginName,
          }),
        );
        return;
      }
      const { data } = await api.post<{ url: string; mail_status: string }>(
        '/business/invitations',
        {
          email: invite.email,
          role: invite.role,
          position_id:
            invite.role !== 'manager' && invite.position_id ? Number(invite.position_id) : null,
          manager_id:
            owner && invite.role !== 'manager' && invite.manager_id
              ? Number(invite.manager_id)
              : null,
          locale,
        },
      );
      setInvitationLink(data.url);
      setInviteOpen(false);
      setInvite({ email: '', role: 'member', position_id: '', manager_id: '' });
      clearInvite({ email: '', role: 'member', position_id: '', manager_id: '' });
      setMessage(
        t(
          data.mail_status === 'queued'
            ? 'Приглашение создано. Письмо готовится к отправке.'
            : 'Приглашение готово — скопируйте ссылку.',
        ),
      );
    });
  }
  return (
    <Shell
      className={`${css.workspace} ${tab === 'overview' ? css.overviewWorkspace : ''}`}
      title={t(tab === 'overview' ? 'Обзор' : 'Персонал')}
      action={
        tab !== 'overview' && (
          <button
            className={styles.primary}
            onClick={() => {
              if (tab === 'positions') {
                setEditing('new');
                return;
              }
              setInviteOpen(true);
              setInvite({ ...invite, role: memberRole });
              setInvitationLink('');
            }}
          >
            <Plus size={18} />
            {t(
              tab === 'positions'
                ? 'Добавить должность'
                : tab === 'managers'
                  ? 'Пригласить руководителя'
                  : tab === 'candidates'
                    ? 'Добавить кандидата'
                    : 'Добавить сотрудника',
            )}
          </button>
        )
      }
    >
      {error && (
        <p className={css.error} role='alert'>
          {t(error)}
        </p>
      )}
      <Toast message={message} onClose={() => setMessage('')} />
      {invitationLink && (
        <BusinessDialog
          title={t('Приглашение готово')}
          onClose={() => setInvitationLink('')}
          className={css.modal}
        >
          <CopyLink url={invitationLink} />
        </BusinessDialog>
      )}
      {confirm && (
        <BusinessDialog
          title={t('Подтверждение действия')}
          busy={busy}
          onClose={() => setConfirm(null)}
          className={css.modal}
        >
          <p>{confirm.label}</p>
          {error && (
            <p className={css.error} role='alert'>
              {t(error)}
            </p>
          )}
          <div className={css.actions}>
            <button className={styles.secondary} disabled={busy} onClick={() => setConfirm(null)}>
              {t('Отмена')}
            </button>
            <button
              className={styles.primary}
              disabled={busy}
              onClick={() => void mutate(confirm.action)}
            >
              {t('Подтвердить')}
            </button>
          </div>
        </BusinessDialog>
      )}
      {inviteOpen && (
        <BusinessDialog
          title={t('Добавить участника')}
          description={t('Создайте доступ по логину или отправьте приглашение на почту.')}
          onClose={closeInvitation}
          busy={busy}
          className={css.modal}
        >
          <div className={css.actions} style={{ marginBottom: 20 }}>
            {(['login', 'email'] as const).map((mode) => (
              <button
                key={mode}
                type='button'
                aria-pressed={accountMode === mode}
                className={accountMode === mode ? styles.primary : styles.secondary}
                onClick={() => {
                  setAccountMode(mode);
                  setInitialPassword('');
                  setError('');
                }}
              >
                {t(mode === 'login' ? 'По логину и паролю' : 'Пригласить по почте')}
              </button>
            ))}
          </div>
          <form className={css.form} onSubmit={sendInvite}>
            {accountMode === 'login' ? (
              <>
                <label>
                  {t('Имя и фамилия')}
                  <input
                    required
                    maxLength={160}
                    autoComplete='off'
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                  />
                </label>
                <label>
                  {t('Логин')}
                  <input
                    required
                    minLength={3}
                    maxLength={64}
                    pattern='[A-Za-z0-9][A-Za-z0-9._\-]{2,63}'
                    autoComplete='off'
                    autoCapitalize='none'
                    spellCheck={false}
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                  />
                </label>
                <p>{t('От 3 до 64 латинских букв, цифр, точек, дефисов или подчёркиваний.')}</p>
                <label>
                  {t('Пароль сотрудника')}
                  <input
                    required
                    type='password'
                    minLength={12}
                    maxLength={128}
                    autoComplete='new-password'
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                  />
                </label>
                <p>
                  {t(
                    'Минимум 12 символов. Сотрудник сможет изменить пароль и подключить почту в профиле.',
                  )}
                </p>
              </>
            ) : (
              <label>
                {t('Электронная почта')}
                <input
                  type='email'
                  required
                  maxLength={255}
                  value={invite.email}
                  onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                />
              </label>
            )}
            {
              <label>
                {t('Роль')}
                <select
                  value={invite.role}
                  onChange={(e) => setInvite({ ...invite, role: e.target.value, position_id: '' })}
                >
                  <option value='member'>{t('Сотрудник')}</option>
                  <option value='candidate'>{t('Кандидат')}</option>
                  {owner && <option value='manager'>{roleName('manager')}</option>}
                </select>
              </label>
            }
            {invite.role !== 'manager' && (
              <label>
                {t('Должность')}
                <PositionPicker
                  value={invite.position_id}
                  onChange={(position_id) => setInvite({ ...invite, position_id })}
                />
              </label>
            )}
            {owner && invite.role !== 'manager' && (
              <label>
                {t('Руководитель')}
                <select
                  value={invite.manager_id}
                  onChange={(e) => setInvite({ ...invite, manager_id: e.target.value })}
                >
                  <option value=''>{t('Без руководителя — назначить позже')}</option>
                  {overview.data?.managers
                    .filter((m) => m.is_active)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name || m.email}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {error && (
              <p className={css.error} role='alert'>
                {t(error)}
              </p>
            )}
            <div className={css.actions}>
              <button className={styles.primary} disabled={busy}>
                {t(accountMode === 'login' ? 'Создать аккаунт' : 'Создать приглашение')}
              </button>
              <button
                type='button'
                className={styles.secondary}
                disabled={busy}
                onClick={closeInvitation}
              >
                {t('Отмена')}
              </button>
            </div>
          </form>
        </BusinessDialog>
      )}
      {tab !== 'overview' && (
        <div
          className={css.tabs}
          role='tablist'
          aria-label={t('Управление компанией')}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const tabs = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]'),
            );
            const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
            if (index < 0) return;
            event.preventDefault();
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? tabs.length - 1
                  : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            tabs[next].focus();
            tabs[next].click();
          }}
        >
          {owner && (
            <button
              role='tab'
              aria-selected={tab === 'managers'}
              onClick={() => setTab('managers')}
            >
              {t('Руководители')}
            </button>
          )}
          <button
            role='tab'
            aria-selected={tab === 'positions'}
            onClick={() => setTab('positions')}
          >
            {t('Должности')}
          </button>
          <button
            role='tab'
            aria-selected={tab === 'employees'}
            onClick={() => setTab('employees')}
          >
            {t('Сотрудники')}
          </button>
          <button
            role='tab'
            aria-selected={tab === 'candidates'}
            onClick={() => setTab('candidates')}
          >
            {t('Кандидаты')}
          </button>
        </div>
      )}
      {tab === 'overview' ? (
        <>
          {overview.loading && !overview.data && (
            <LoadingState>{t('Собираем результаты…')}</LoadingState>
          )}
          {!!overview.error && (
            <RequestError error={overview.error} onRetry={() => void overview.reload()} />
          )}
          {overview.data && <BusinessDashboard data={overview.data} />}
        </>
      ) : tab === 'positions' ? (
        <section>
          <div className={css.toolbar}>
            <span className={css.muted}>
              {t('Должности')}: {positions.data?.total ?? 0}
            </span>
            <label className={css.check}>
              <input
                type='checkbox'
                checked={archived}
                onChange={(e) => {
                  setArchived(e.target.checked);
                  setPositionOffset(0);
                }}
              />
              {t('Показать архив')}
            </label>
          </div>
          {positions.loading && <LoadingState>{t('Загрузка…')}</LoadingState>}
          {!!positions.error && (
            <p role='alert'>
              {t(errorText(positions.error))}{' '}
              <button onClick={() => void positions.reload()}>{t('Повторить')}</button>
            </p>
          )}
          {!positions.loading && !positions.error && positions.data?.items.length === 0 && (
            <div className={css.empty}>
              <h2>{t(archived ? 'В архиве пока нет должностей' : 'Начните с первой должности')}</h2>
              <p>
                {t('Создайте должность, чтобы собрать для неё регламенты и добавить сотрудников.')}
              </p>
            </div>
          )}
          <div className={css.positionGrid}>
            {positions.data?.items.map((position) => (
              <article key={position.id} className={css.position}>
                <div className={css.cardTop}>
                  <span className={css.positionIcon}>
                    <BriefcaseBusiness size={22} />
                  </span>
                  <span className={css.muted}>
                    {t(position.is_archived ? 'Архив' : 'Должность')}
                  </span>
                </div>
                <h2>{position.name}</h2>
                <p>{position.description}</p>
                <div className={css.counts}>
                  <span>
                    <strong>{position.employee_count}</strong>
                    {t('Сотрудники')}
                  </span>
                  <span>
                    <strong>{position.course_count}</strong>
                    {t('Регламенты')}
                  </span>
                  <span>
                    <strong>{position.candidate_count ?? 0}</strong>
                    {t('Кандидаты')}
                  </span>
                </div>
                <div className={css.actions}>
                  <button
                    className={css.cardLink}
                    onClick={() => navigate(`/company/positions/${position.id}`)}
                  >
                    {t('Открыть должность')}
                    <ArrowUpRight size={16} />
                  </button>
                  <details className={css.more}>
                    <summary aria-label={`${t('Действия')}: ${position.name}`}>
                      <MoreHorizontal size={20} />
                    </summary>
                    <div>
                      {!position.is_archived && (
                        <button className={styles.secondary} onClick={() => setEditing(position)}>
                          {t('Изменить')}
                        </button>
                      )}
                      <button
                        className={styles.secondary}
                        disabled={busy}
                        onClick={() =>
                          setConfirm({
                            label: t(
                              position.is_archived
                                ? 'Восстановить должность?'
                                : 'Архивировать должность? Регламенты и результаты обучения сохранятся. Неиспользованные приглашения на эту должность будут отозваны.',
                            ),
                            action: async () => {
                              await api.put(`/business/positions/${position.id}/state`, {
                                expected_revision: position.revision,
                                is_archived: !position.is_archived,
                              });
                            },
                          })
                        }
                      >
                        {t(position.is_archived ? 'Восстановить' : 'В архив')}
                      </button>
                    </div>
                  </details>
                </div>
              </article>
            ))}
          </div>
          <Pager
            offset={positionOffset}
            total={positions.data?.total ?? 0}
            onChange={setPositionOffset}
          />
        </section>
      ) : (
        <section>
          <div className={css.toolbar}>
            <label className={css.search}>
              <span className={css.srOnly}>{t('Поиск участника')}</span>
              <Search size={18} aria-hidden='true' />
              <input
                type='search'
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setEmployeeOffset(0);
                }}
                placeholder={t('Имя, логин или почта')}
              />
            </label>
            <span>
              {t('Всего')}: {employees.data?.total ?? 0}
            </span>
          </div>
          {owner && tab !== 'managers' && (
            <label className={css.picker}>
              {t('Руководитель')}
              <select
                value={managerFilter}
                onChange={(e) => {
                  setEmployeeOffset(0);
                  setParams({ tab, ...(e.target.value ? { manager_id: e.target.value } : {}) });
                }}
              >
                <option value=''>{t('Все руководители')}</option>
                {overview.data?.managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </select>
            </label>
          )}
          {employees.loading && <LoadingState>{t('Загрузка…')}</LoadingState>}
          {!!employees.error && (
            <p role='alert'>
              {t(errorText(employees.error))}{' '}
              <button onClick={() => void employees.reload()}>{t('Повторить')}</button>
            </p>
          )}
          <div className={css.tableWrap}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>{t('Участник')}</th>
                  <th>{t('Должность')}</th>
                  <th>{t('Доступ')}</th>
                  <th>
                    <span className={css.srOnly}>{t('Действия')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.data?.items.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <div className={css.personCell}>
                        <span className={css.avatar} aria-hidden='true'>
                          {(person.full_name || person.username || person.email || t('Сотрудник'))
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>
                        <div>
                          <strong>
                            {person.full_name || person.username || person.email || t('Сотрудник')}
                          </strong>
                          <small>{person.email || person.username}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {person.position_name ||
                        (['manager', 'admin'].includes(person.organization_role)
                          ? roleName(person.organization_role)
                          : t('Без должности'))}
                    </td>
                    <td>
                      <span className={`${css.badge} ${person.is_active ? css.activeBadge : ''}`}>
                        {t(person.is_active ? 'Активен' : 'Приостановлен')}
                      </span>
                    </td>
                    <td>
                      <button
                        className={css.iconButton}
                        aria-label={`${t('Настроить доступ')}: ${person.full_name || person.username || person.email || t('Сотрудник')}`}
                        onClick={() => {
                          setError('');
                          setResetPassword('');
                          setManaging(person.id);
                        }}
                      >
                        <MoreHorizontal size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {person && (
            <BusinessDialog
              title={person.full_name || person.username || person.email || t('Сотрудник')}
              description={person.email || person.username || ''}
              busy={busy}
              onClose={() => {
                setResetPassword('');
                setManaging(null);
              }}
              className={css.modal}
            >
              <div className={css.form}>
                {person.username && person.is_active && (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void mutate(async () => {
                        await api.post(`/business/employees/${person.id}/password`, {
                          new_password: resetPassword,
                          expected_auth_version: person.auth_version,
                        });
                        setResetPassword('');
                        setMessage(t('Пароль обновлён. Передайте новый пароль сотруднику.'));
                      });
                    }}
                  >
                    <p>
                      {t('Логин')}: <strong>{person.username}</strong>
                    </p>
                    <label>
                      {t('Новый пароль сотрудника')}
                      <input
                        type='password'
                        autoComplete='new-password'
                        required
                        minLength={12}
                        maxLength={128}
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                      />
                    </label>
                    <button className={styles.secondary} disabled={busy}>
                      {t('Задать новый пароль')}
                    </button>
                  </form>
                )}
                {error && (
                  <p role='alert' className={css.error}>
                    {t(error)}
                  </p>
                )}
                <label>
                  {t('Должность')}
                  {['member', 'candidate'].includes(person.organization_role) &&
                  person.is_active ? (
                    <PositionPicker
                      currentName={person.position_name}
                      label={`${t('Должность')}: ${person.email}`}
                      value={person.position_id ? String(person.position_id) : ''}
                      disabled={busy}
                      onChange={(value) =>
                        void mutate(async () => {
                          await api.put(`/business/employees/${person.id}/position`, {
                            position_id: value ? Number(value) : null,
                            expected_position_id: person.position_id,
                          });
                          setMessage(t('Должность сотрудника обновлена'));
                        })
                      }
                    />
                  ) : (
                    '—'
                  )}
                </label>
                {owner && tab !== 'managers' && (
                  <label className={css.formLabel}>
                    {t('Руководитель')}
                    <div className={css.picker}>
                      <select
                        aria-label={`${t('Руководитель')}: ${person.email}`}
                        disabled={busy}
                        value={person.manager_id ?? ''}
                        onChange={(e) => {
                          const manager_id = e.target.value ? Number(e.target.value) : null;
                          confirmPerson({
                            label: t(
                              'Изменить руководителя? Все назначения, ответы и результаты участника сохранятся.',
                            ),
                            action: async () => {
                              await api.put(`/business/employees/${person.id}/reporting-line`, {
                                manager_id,
                                expected_manager_id: person.manager_id,
                                expected_auth_version: person.auth_version,
                              });
                            },
                          });
                        }}
                      >
                        <option value=''>{t('Без руководителя')}</option>
                        {overview.data?.managers.map((m) => (
                          <option key={m.id} value={m.id} disabled={!m.is_active}>
                            {m.full_name || m.email}
                            {!m.is_active ? ` (${t('Приостановлен')})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                )}
                <div className={css.personActions}>
                  {!person.is_active ? (
                    t('Приостановлен')
                  ) : owner &&
                    ['member', 'candidate', 'manager', 'admin'].includes(
                      person.organization_role,
                    ) ? (
                    <button
                      className={styles.secondary}
                      disabled={busy}
                      onClick={() =>
                        confirmPerson({
                          label: `${person.full_name || person.username || person.email || t('Сотрудник')}: ${t(['member', 'candidate'].includes(person.organization_role) ? 'назначить управляющим компанией?' : 'снять полномочия управляющего? Его команда перейдёт в список без руководителя.')} ${t('Пользователю потребуется войти заново.')}`,
                          action: async () => {
                            await api.put(`/business/employees/${person.id}/manager`, {
                              role: ['member', 'candidate'].includes(person.organization_role)
                                ? 'manager'
                                : 'member',
                              expected_auth_version: person.auth_version,
                            });
                          },
                        })
                      }
                    >
                      {t(
                        ['member', 'candidate'].includes(person.organization_role)
                          ? 'Назначить управляющим'
                          : 'Снять полномочия',
                      )}
                    </button>
                  ) : (
                    t('Активен')
                  )}
                  {person.id !== user?.id &&
                    (['member', 'candidate'].includes(person.organization_role) ||
                      (owner && ['manager', 'admin'].includes(person.organization_role))) && (
                      <div className={css.actions}>
                        <button
                          className={styles.secondary}
                          disabled={busy}
                          onClick={() =>
                            confirmPerson({
                              label: `${person.full_name || person.username || person.email || t('Сотрудник')}: ${t(person.is_active ? 'приостановить доступ? Данные и результаты сохранятся.' : 'восстановить доступ?')}`,
                              action: async () => {
                                await api.put(`/business/employees/${person.id}/access`, {
                                  is_active: !person.is_active,
                                  expected_auth_version: person.auth_version,
                                });
                              },
                            })
                          }
                        >
                          {t(person.is_active ? 'Приостановить доступ' : 'Восстановить доступ')}
                        </button>
                      </div>
                    )}
                  {['member', 'candidate'].includes(person.organization_role) && (
                    <div className={css.actions}>
                      <Link
                        className={css.backLink}
                        to={`/learning-analytics?user_id=${person.id}`}
                      >
                        {t('Результаты')} ↗
                      </Link>
                      <button
                        className={styles.secondary}
                        disabled={busy}
                        onClick={() =>
                          confirmPerson({
                            label: t(
                              person.organization_role === 'candidate'
                                ? 'Перевести кандидата в сотрудники? Назначения и результаты сохранятся.'
                                : 'Перевести сотрудника в кандидаты? Назначения и результаты сохранятся.',
                            ),
                            action: async () => {
                              await api.put(`/business/employees/${person.id}/role`, {
                                role:
                                  person.organization_role === 'candidate' ? 'member' : 'candidate',
                                expected_auth_version: person.auth_version,
                              });
                            },
                          })
                        }
                      >
                        {t(
                          person.organization_role === 'candidate'
                            ? 'Принять в сотрудники'
                            : 'Перевести в кандидаты',
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </BusinessDialog>
          )}
          {!employees.loading && employees.data?.total === 0 && (
            <p>{t('Участники не найдены. Добавьте сотрудника или измените поиск.')}</p>
          )}
          <Pager
            offset={employeeOffset}
            total={employees.data?.total ?? 0}
            onChange={setEmployeeOffset}
          />
          {((invitations.data?.items.length ?? 0) > 0 || !!invitations.error) && (
            <details className={css.pending}>
              <summary>
                {t('Ожидают приглашения')} <span>{invitations.data?.items.length ?? 0}</span>
              </summary>
              {!!invitations.error && <p role='alert'>{t(errorText(invitations.error))}</p>}
              {invitations.data?.items.length === 0 && (
                <p>{t('Все приглашения приняты или закрыты')}</p>
              )}
              {invitations.data?.items.map((item) => (
                <div className={css.invitation} key={item.id}>
                  <span>
                    {item.email}
                    <small>{roleName(item.role)}</small>
                  </span>
                  <button
                    className={styles.secondary}
                    disabled={busy}
                    onClick={() =>
                      setConfirm({
                        label: `${t('Отозвать приглашение')}: ${item.email}?`,
                        action: async () => {
                          await api.delete(`/business/invitations/${item.id}`);
                        },
                      })
                    }
                  >
                    {t('Отозвать приглашение')}
                  </button>
                </div>
              ))}
            </details>
          )}
        </section>
      )}
      {editing && (
        <PositionEditor
          key={editing === 'new' ? 'new' : `${editing.id}:${editing.revision}`}
          position={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      )}
    </Shell>
  );
}

type PositionOptions = {
  query: ReturnType<typeof useLearningData<Page<Position>>>;
  offset: number;
  setOffset: (value: number) => void;
};
const PositionOptionsContext = createContext<PositionOptions | null>(null);
function PositionOptionsProvider({ children }: { children: ReactNode }) {
  const [offset, setOffset] = useState(0);
  const query = useLearningData<Page<Position>>(`/business/positions?offset=${offset}&limit=20`);
  return (
    <PositionOptionsContext.Provider value={{ query, offset, setOffset }}>
      {children}
    </PositionOptionsContext.Provider>
  );
}
function PositionPicker({
  value,
  onChange,
  disabled,
  label,
  currentName,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  currentName?: string;
}) {
  const { t } = useLocale();
  const { query, offset, setOffset } = useContext(PositionOptionsContext)!;
  return (
    <div className={css.picker}>
      <select
        aria-label={label ?? t('Должность')}
        value={value}
        disabled={disabled || query.loading}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value=''>{t('Без должности')}</option>
        {value && !query.data?.items.some((p) => String(p.id) === value) && (
          <option value={value}>{currentName || `${t('Текущая должность')} #${value}`}</option>
        )}
        {query.data?.items.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {!!query.error && (
        <button type='button' onClick={() => void query.reload()}>
          {t('Повторить')}
        </button>
      )}
      {(query.data?.total ?? 0) > 20 && (
        <span>
          <button
            type='button'
            disabled={!offset}
            onClick={() => setOffset(offset - 20)}
            aria-label={t('Предыдущие должности')}
          >
            ←
          </button>
          <button
            type='button'
            disabled={offset + 20 >= (query.data?.total ?? 0)}
            onClick={() => setOffset(offset + 20)}
            aria-label={t('Следующие должности')}
          >
            →
          </button>
        </span>
      )}
    </div>
  );
}

function PositionEditor({
  position,
  onClose,
  onSaved,
}: {
  position: Position | null;
  onClose: () => void;
  onSaved: (position: Position) => Promise<void>;
}) {
  const { t } = useLocale();
  const [form, setForm] = useState(
    position
      ? {
          name: position.name,
          description: position.description,
          responsibilities: position.responsibilities,
          competencies: position.competencies,
        }
      : blankPosition,
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = position
        ? await api.put<Position>(`/business/positions/${position.id}`, {
            ...form,
            expected_revision: position.revision,
          })
        : await api.post<Position>('/business/positions', form);
      await onSaved(data);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <BusinessDialog
      title={t(position ? 'Изменить должность' : 'Новая должность')}
      onClose={onClose}
      busy={busy}
      guard
      className={css.modal}
    >
      <form className={css.form} onSubmit={save}>
        <label>
          {t('Название должности')}
          <input
            autoFocus
            required
            maxLength={200}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('Например, администратор')}
          />
        </label>
        <label>
          {t('Описание работы')}
          <textarea
            maxLength={3000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={t('Чем занимается сотрудник и для кого работает')}
          />
        </label>
        <details className={css.jobDescription}>
          <summary>{t('Обязанности и навыки')}</summary>
          <label>
            {t('Основные обязанности')}
            <textarea
              maxLength={6000}
              value={form.responsibilities}
              onChange={(e) => setForm({ ...form, responsibilities: e.target.value })}
              placeholder={t(
                'Например: принять обращение, уточнить проблему, предложить решение, проверить результат',
              )}
            />
          </label>
          <label>
            {t('Необходимые навыки')}
            <textarea
              maxLength={4000}
              value={form.competencies}
              onChange={(e) => setForm({ ...form, competencies: e.target.value })}
              placeholder={t('Что сотрудник должен знать и уметь после обучения')}
            />
          </label>
        </details>
        {error && (
          <p className={css.error} role='alert'>
            {t(error)}
          </p>
        )}
        <div className={css.actions}>
          <button className={styles.primary} disabled={busy}>
            {t('Сохранить должность')}
          </button>
          <button type='button' className={styles.secondary} disabled={busy} data-dialog-close>
            {t('Отмена')}
          </button>
        </div>
      </form>
    </BusinessDialog>
  );
}

function PositionScreen({ positionId }: { positionId: number }) {
  const { t } = useLocale();
  const query = useLearningData<Position>(
    Number.isInteger(positionId) && positionId > 0 ? `/business/positions/${positionId}` : null,
  );
  if (!Number.isInteger(positionId) || positionId < 1) return <StatusPage code='404' />;
  return (
    <Shell className={css.workspace} title={query.data?.name ?? t('Должность')}>
      <Link to='/company?tab=positions' className={css.backLink}>
        <ArrowLeft size={16} /> {t('Должности')}
      </Link>
      {query.loading && <LoadingState>{t('Загрузка…')}</LoadingState>}
      {!!query.error && <RequestError error={query.error} onRetry={() => void query.reload()} />}
      {query.data && (
        <PositionDetail key={positionId} position={query.data} onRefresh={query.reload} />
      )}
    </Shell>
  );
}

function PositionDetail({
  position,
  onRefresh,
}: {
  position: Position;
  onRefresh: () => Promise<void>;
}) {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const courses = useLearningData<Page<Course>>(
    `/business/positions/${position.id}/regulations?offset=${offset}&limit=20`,
  );
  const [newCourse, setNewCourse] = useState(false);
  const [form, setForm, clearForm] = useDurableState(`business-regulation:${position.id}`, {
    title: '',
    goal: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [assigning, setAssigning] = useState<Course | null>(null);
  const [renaming, setRenaming] = useState<EditableEntity | null>(null);
  const [editPosition, setEditPosition] = useState(false);
  async function create(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post<{ url: string }>(
        `/business/positions/${position.id}/regulations`,
        { ...form, language: locale, expected_position_revision: position.revision },
      );
      clearForm(form);
      navigate(data.url);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  }
  async function assign() {
    if (!assigning || busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post<{ created: number; already_assigned: number }>(
        `/business/positions/${position.id}/regulations/${assigning.id}/assign`,
        { expected_revision: position.revision },
      );
      setMessage(
        `${t('Назначено')}: ${data.created}. ${t('Уже назначено')}: ${data.already_assigned}.`,
      );
      setAssigning(null);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={css.positionDetail}>
      <section aria-label={t('Регламенты должности')}>
        <div className={css.toolbar}>
          <span className={css.counts}>
            {t('Сотрудники')}: {position.employee_count} · {t('Кандидаты')}:{' '}
            {position.candidate_count ?? 0} · {t('Регламенты')}:{' '}
            {courses.data?.total ?? position.course_count}
          </span>
          {!position.is_archived && (
            <button className={styles.secondary} onClick={() => setEditPosition(true)}>
              {t('Изменить должность')}
            </button>
          )}
        </div>
        {position.description && <p>{position.description}</p>}
        {(position.responsibilities || position.competencies) && (
          <details className={css.jobDescription}>
            <summary>{t('Обязанности и навыки')}</summary>
            <h3>{t('Обязанности')}</h3>
            <p className={css.prose}>{position.responsibilities || '—'}</p>
            <h3>{t('Навыки')}</h3>
            <p className={css.prose}>{position.competencies || '—'}</p>
          </details>
        )}
        <div className={css.toolbar}>
          <h2>{t('Регламенты')}</h2>
          {!position.is_archived && (
            <button className={styles.primary} onClick={() => setNewCourse(!newCourse)}>
              {t('Добавить регламент')}
            </button>
          )}
        </div>
        {newCourse && (
          <BusinessDialog
            title={t('Новый регламент')}
            onClose={() => setNewCourse(false)}
            busy={busy}
            className={css.modal}
          >
            <form className={css.form} onSubmit={create}>
              <label>
                {t('Название регламента')}
                <input
                  required
                  maxLength={200}
                  placeholder={t('Например, 01. Стандарт сервиса')}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label>
                {t('Что регулирует документ')}
                <textarea
                  required
                  maxLength={2000}
                  placeholder={t('Например, как встречать гостей и оформлять запись')}
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                />
              </label>

              <p>{t('Затем добавьте документы, из которых нужно подготовить регламент.')}</p>
              <button className={styles.primary} disabled={busy}>
                {t('Добавить материалы')}
              </button>
              {error && (
                <p role='alert' className={css.error}>
                  {t(error)}
                </p>
              )}
            </form>
          </BusinessDialog>
        )}
        {error && (
          <p className={css.error} role='alert'>
            {t(error)}
          </p>
        )}
        <Toast message={message} onClose={() => setMessage('')} />
        {assigning && (
          <BusinessDialog
            title={t('Назначить регламент')}
            description={assigning.name}
            onClose={() => setAssigning(null)}
            busy={busy}
            className={css.modal}
          >
            <p>
              {t(
                'Сотрудники и кандидаты этой должности получат доступ к регламенту. Результаты тех, кто уже прошёл его, сохранятся.',
              )}
            </p>
            {error && (
              <p role='alert' className={css.error}>
                {t(error)}
              </p>
            )}
            <div className={css.actions}>
              <button
                className={styles.secondary}
                disabled={busy}
                onClick={() => setAssigning(null)}
              >
                {t('Отмена')}
              </button>
              <button className={styles.primary} disabled={busy} onClick={() => void assign()}>
                {t('Назначить регламент')}
              </button>
            </div>
          </BusinessDialog>
        )}
        {courses.loading && <LoadingState>{t('Загрузка…')}</LoadingState>}
        {!!courses.error && (
          <RequestError error={courses.error} onRetry={() => void courses.reload()} />
        )}
        {!courses.loading && courses.data?.items.length === 0 && (
          <p>{t('Для этой должности пока нет регламентов')}</p>
        )}
        {courses.data?.items.map((course) => (
          <article className={css.course} key={course.id}>
            <span className={css.documentIcon}>
              <FileText size={22} />
            </span>
            <div className={css.courseTitle}>
              <h3>{course.name}</h3>
              <p>
                {t(
                  statuses[
                    course.publication_status === 'published' ? 'published' : course.status
                  ] ?? 'Черновик',
                )}
              </p>
            </div>
            <div className={css.actions}>
              <Link
                className={styles.secondary}
                to={
                  course.status !== 'generating'
                    ? `/courses/${course.id}/edit?position=${position.id}`
                    : `/express?course=${course.id}&step=1&position=${position.id}`
                }
              >
                {t('Открыть регламент')}
              </Link>

              {course.publication_status === 'published' && !position.is_archived && (
                <button
                  className={styles.primary}
                  disabled={busy}
                  onClick={() => setAssigning(course)}
                >
                  {t('Назначить команде')}
                </button>
              )}
              <details className={css.more}>
                <summary aria-label={`${t('Действия')}: ${course.name}`}>
                  <MoreHorizontal size={20} />
                </summary>
                <div>
                  {' '}
                  {!position.is_archived && (
                    <button
                      className={styles.secondary}
                      disabled={course.status === 'generating' || busy}
                      onClick={() =>
                        setRenaming({
                          kind: 'course',
                          id: course.id,
                          courseId: course.id,
                          title: course.name,
                          description: course.description,
                          revision: course.content_revision,
                        })
                      }
                    >
                      {t('Переименовать')}
                    </button>
                  )}
                  <Link
                    className={styles.secondary}
                    to={`/learning-analytics?course_id=${course.id}`}
                  >
                    {t('Результаты сотрудников')}
                  </Link>
                </div>
              </details>
            </div>
          </article>
        ))}
        <Pager offset={offset} total={courses.data?.total ?? 0} onChange={setOffset} />
        {renaming && (
          <EntityEditor
            entity={renaming}
            onClose={() => setRenaming(null)}
            onSaved={() => {
              setRenaming(null);
              void courses.reload();
            }}
          />
        )}
        {editPosition && (
          <PositionEditor
            position={position}
            onClose={() => setEditPosition(false)}
            onSaved={async () => {
              await onRefresh();
              setEditPosition(false);
            }}
          />
        )}
      </section>
    </div>
  );
}
