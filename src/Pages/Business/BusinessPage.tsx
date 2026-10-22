import { createContext, useContext, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, BriefcaseBusiness, Users, BookOpen, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useLocale } from '@/i18n/useLocale';
import { api } from '@/shared/api';
import { Shell, CopyLink, styles, errorText, statuses } from '../Workspace/shared';
import { useLearningData } from '../Learning/useLearningData';
import { LoadingState } from '@/Components/RequestState';
import StatusPage from '../AccessPage/StatusPage';
import EntityEditor, { type EditableEntity } from '@/Components/CourseEditPage/EntityEditor';
import { RequestError } from '@/Components/RequestState';
import ConfirmationDialog from '../TeamLearning/ManagementConfirmation';
import css from './business.module.css';

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
  course_count: number;
};
type Employee = {
  id: number;
  full_name: string;
  email: string;
  organization_role: string;
  is_active: boolean;
  auth_version: number;
  position_id: number | null;
  position_name?: string;
};
type Invitation = { id: number; email: string; role: string; position_id: number | null };
type Course = { id: number; name: string; description?: string; content_revision: number; status: string; publication_status: string };
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
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'employees' ? 'employees' : 'positions';
  const setTab = (value: string) => setParams(value === 'employees' ? { tab: value } : {});
  const [archived, setArchived] = useState(false);
  const [positionOffset, setPositionOffset] = useState(0);
  const [employeeOffset, setEmployeeOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Position | 'new' | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: '', role: 'member', position_id: '' });
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
    `/business/employees?offset=${employeeOffset}&limit=20&q=${encodeURIComponent(search)}`,
  );
  const invitations = useLearningData<{ items: Invitation[] }>('/business/invitations');
  const owner = user?.organization_role === 'owner';
  const options = useContext(PositionOptionsContext)!;
  const refresh = async () => {
    await Promise.all([
      positions.reload(),
      employees.reload(),
      invitations.reload(),
      options.query.reload(),
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
  async function sendInvite(event: FormEvent) {
    event.preventDefault();
    await mutate(async () => {
      const { data } = await api.post<{ url: string; mail_status: string }>(
        '/business/invitations',
        {
          email: invite.email,
          role: invite.role,
          position_id:
            invite.role === 'member' && invite.position_id ? Number(invite.position_id) : null,
          locale,
        },
      );
      setInvitationLink(data.url);
      setInviteOpen(false);
      setInvite({ email: '', role: 'member', position_id: '' });
      setMessage(
        t(
          data.mail_status === 'queued'
            ? 'Приглашение отправлено на почту'
            : 'Передайте приглашение по ссылке',
        ),
      );
    });
  }
  return (
    <Shell
      title={t('Персонал')}
      description={t(
        'Рабочее пространство руководителя. Управляйте должностями, регламентами и подготовкой сотрудников.',
      )}
      action={
        <button
          className={styles.primary}
          onClick={() => {
            setInviteOpen(true);
            setInvitationLink('');
          }}
        >
          <Plus size={18} />
          {t(owner ? 'Пригласить в компанию' : 'Пригласить сотрудника')}
        </button>
      }
    >
      <div className={css.journey}>
        <span>
          <Users size={20} />
          {t('Команда')}
        </span>
        <span>→</span>
        <span>
          <BriefcaseBusiness size={20} />
          {t('Должности')}
        </span>
        <span>→</span>
        <span>
          <BookOpen size={20} />
          {t('Регламенты')}
        </span>
      </div>
      {error && (
        <p className={css.error} role='alert'>
          {t(error)}
        </p>
      )}
      {message && (
        <p className={css.success} role='status'>
          {message}
        </p>
      )}
      {invitationLink && <CopyLink url={invitationLink} />}
      {confirm && (
        <ConfirmationDialog
          confirmation={{
            title: t('Подтверждение действия'),
            description: confirm.label,
            confirmLabel: t('Подтвердить'),
            action: () => mutate(confirm.action),
          }}
          onClose={() => setConfirm(null)}
        />
      )}
      {inviteOpen && (
        <form className={`${styles.panel} ${css.form}`} onSubmit={sendInvite}>
          <h2>{t('Приглашение в компанию')}</h2>
          <p>
            {t('Человек получит личную ссылку и сам задаст пароль. Передавать пароли не нужно.')}
          </p>
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
          {owner && (
            <label>
              {t('Роль')}
              <select
                value={invite.role}
                onChange={(e) => setInvite({ ...invite, role: e.target.value, position_id: '' })}
              >
                <option value='member'>{t('Сотрудник')}</option>
                <option value='manager'>{t('Управляющий компанией')}</option>
              </select>
            </label>
          )}
          {invite.role === 'member' && (
            <label>
              {t('Должность')}
              <PositionPicker
                value={invite.position_id}
                onChange={(position_id) => setInvite({ ...invite, position_id })}
              />
            </label>
          )}
          <p>
            {t(
              invite.role === 'manager'
                ? 'Руководитель создаёт должности, приглашает сотрудников и готовит регламенты. Доступами руководителей управляет владелец компании.'
                : 'Сотрудник увидит назначенные регламенты в разделе «Мои регламенты».',
            )}
          </p>
          <div className={css.actions}>
            <button className={styles.primary} disabled={busy}>
              {t('Создать приглашение')}
            </button>
            <button
              type='button'
              className={styles.secondary}
              disabled={busy}
              onClick={() => setInviteOpen(false)}
            >
              {t('Отмена')}
            </button>
          </div>
        </form>
      )}
      <div className={css.tabs} role='tablist' aria-label={t('Управление компанией')}>
        <button role='tab' aria-selected={tab === 'positions'} onClick={() => setTab('positions')}>
          {t('Должности')}
        </button>
        <button role='tab' aria-selected={tab === 'employees'} onClick={() => setTab('employees')}>
          {t('Сотрудники')}
        </button>
      </div>
      {tab === 'positions' ? (
        <section>
          <div className={css.toolbar}>
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
            <button className={styles.primary} onClick={() => setEditing('new')}>
              <Plus size={18} />
              {t('Добавить должность')}
            </button>
          </div>
          {positions.loading && <LoadingState>{t('Загрузка…')}</LoadingState>}
          {!!positions.error && (
            <p role='alert'>
              {t(errorText(positions.error))}{' '}
              <button onClick={() => void positions.reload()}>{t('Повторить')}</button>
            </p>
          )}
          {!positions.loading && !positions.error && positions.data?.items.length === 0 && (
            <div className={styles.panel}>
              <h2>{t(archived ? 'В архиве пока нет должностей' : 'Начните с первой должности')}</h2>
              <p>
                {t(
                  'Добавьте, например, должности «Администратор» и «Старший администратор». В каждой будет свой список регламентов и сотрудников.',
                )}
              </p>
            </div>
          )}
          <div className={styles.grid}>
            {positions.data?.items.map((position) => (
              <article key={position.id} className={`${styles.card} ${css.position}`}>
                <BriefcaseBusiness size={26} />
                <h2>{position.name}</h2>
                <p>
                  {position.description || t('Добавьте описание работы и требования к сотруднику')}
                </p>
                <div className={css.counts}>
                  <span>
                    {t('Сотрудники')}: {position.employee_count}
                  </span>
                  <span>
                    {t('Регламенты')}: {position.course_count}
                  </span>
                </div>
                <div className={css.actions}>
                  <button className={styles.primary} onClick={() => navigate(`/company/positions/${position.id}`)}>
                    {t('Открыть должность')}
                    <ArrowUpRight size={16} />
                  </button>
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
              {t('Поиск сотрудника')}
              <input
                type='search'
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setEmployeeOffset(0);
                }}
                placeholder={t('Имя или почта')}
              />
            </label>
            <span>
              {t('Всего')}: {employees.data?.total ?? 0}
            </span>
          </div>
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
                  <th>{t('Сотрудник')}</th>
                  <th>{t('Роль')}</th>
                  <th>{t('Должность')}</th>
                  <th>{t('Доступ')}</th>
                </tr>
              </thead>
              <tbody>
                {employees.data?.items.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <strong>{person.full_name || person.email}</strong>
                      <small>{person.email}</small>
                    </td>
                    <td>
                      {t(
                        (
                          {
                            owner: 'Владелец',
                            admin: 'Администратор',
                            manager: 'Управляющий компанией',
                            member: 'Сотрудник',
                          } as Record<string, string>
                        )[person.organization_role] ?? person.organization_role,
                      )}
                    </td>
                    <td>
                      {person.organization_role === 'member' && person.is_active ? (
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
                    </td>
                    <td>
                      {!person.is_active ? (
                        t('Приостановлен')
                      ) : owner && ['member', 'manager'].includes(person.organization_role) ? (
                        <button
                          className={styles.secondary}
                          disabled={busy}
                          onClick={() =>
                            setConfirm({
                              label: `${person.full_name || person.email}: ${t(person.organization_role === 'member' ? 'назначить управляющим компанией?' : 'снять полномочия управляющего?')} ${t('Пользователю потребуется войти заново.')}`,
                              action: async () => {
                                await api.put(`/business/employees/${person.id}/manager`, {
                                  role:
                                    person.organization_role === 'member' ? 'manager' : 'member',
                                  expected_auth_version: person.auth_version,
                                });
                              },
                            })
                          }
                        >
                          {t(
                            person.organization_role === 'member'
                              ? 'Назначить управляющим'
                              : 'Снять полномочия',
                          )}
                        </button>
                      ) : (
                        t('Активен')
                      )}
                      {person.id !== user?.id &&
                        (person.organization_role === 'member' ||
                          (owner && person.organization_role === 'manager')) && (
                          <div className={css.actions}>
                            <button
                              className={styles.secondary}
                              disabled={busy}
                              onClick={() =>
                                setConfirm({
                                  label: `${person.full_name || person.email}: ${t(person.is_active ? 'приостановить доступ? Данные и результаты сохранятся.' : 'восстановить доступ?')}`,
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!employees.loading && employees.data?.total === 0 && <p>{t('Сотрудники не найдены')}</p>}
          <Pager
            offset={employeeOffset}
            total={employees.data?.total ?? 0}
            onChange={setEmployeeOffset}
          />
          <section className={styles.panel}>
            <h2>{t('Ожидают приглашения')}</h2>
            {!!invitations.error && <p role='alert'>{t(errorText(invitations.error))}</p>}
            {invitations.data?.items.length === 0 && (
              <p>{t('Все приглашения приняты или закрыты')}</p>
            )}
            {invitations.data?.items.map((item) => (
              <div className={css.invitation} key={item.id}>
                <span>
                  {item.email}
                  <small>
                    {t(item.role === 'manager' ? 'Управляющий компанией' : 'Сотрудник')}
                  </small>
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
          </section>
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
  const dialog = useRef<HTMLElement>(null);
  useDialogFocus(dialog, { busy, onClose });
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
    <div className={css.overlay}>
      <section
        ref={dialog}
        tabIndex={-1}
        className={css.dialog}
        role='dialog'
        aria-modal='true'
        aria-labelledby='position-title'
      >
        <form className={css.form} onSubmit={save}>
          <h2 id='position-title'>{t(position ? 'Изменить должность' : 'Новая должность')}</h2>
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
          {error && (
            <p className={css.error} role='alert'>
              {t(error)}
            </p>
          )}
          <div className={css.actions}>
            <button className={styles.primary} disabled={busy}>
              {t('Сохранить должность')}
            </button>
            <button type='button' className={styles.secondary} disabled={busy} onClick={onClose}>
              {t('Отмена')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PositionScreen({ positionId }: { positionId: number }) {
  const { t } = useLocale();
  const query = useLearningData<Position>(Number.isInteger(positionId) && positionId > 0 ? `/business/positions/${positionId}` : null);
  if (!Number.isInteger(positionId) || positionId < 1) return <StatusPage code='404' />;
  return <Shell title={query.data?.name ?? t('Должность')} description={t('Регламенты и требования для этой должности')}>
    <Link to='/company' className={css.backLink}>← {t('Персонал')} / {t('Должности')}</Link>
    {query.loading && <LoadingState>{t('Загрузка…')}</LoadingState>}
    {!!query.error && <RequestError error={query.error} onRetry={() => void query.reload()} />}
    {query.data && <PositionDetail key={positionId} position={query.data} onRefresh={query.reload} />}
  </Shell>;
}

function PositionDetail({ position, onRefresh }: { position: Position; onRefresh: () => Promise<void> }) {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const courses = useLearningData<Page<Course>>(
    `/business/positions/${position.id}/regulations?offset=${offset}&limit=20`,
  );
  const [newCourse, setNewCourse] = useState(false);
  const [form, setForm] = useState({
    title: '',
    goal: `${t('Подготовить сотрудника к самостоятельному выполнению обязанностей')}: ${position.name}`,
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
          <span className={css.counts}>{t('Сотрудники')}: {position.employee_count} · {t('Регламенты')}: {courses.data?.total ?? position.course_count}</span>
          {!position.is_archived && <button className={styles.secondary} onClick={() => setEditPosition(true)}>{t('Изменить должность')}</button>}
        </div>
        <p>{position.description}</p>
        <details className={css.jobDescription}><summary>{t('Обязанности и навыки')}</summary><h3>{t('Обязанности')}</h3>
        <p className={css.prose}>{position.responsibilities || '—'}</p>
        <h3>{t('Навыки')}</h3>
        <p className={css.prose}>{position.competencies || '—'}</p></details>
        <div className={css.toolbar}>
          <h3>{t('Регламенты для должности')}</h3>
          {!position.is_archived && (
            <button className={styles.primary} onClick={() => setNewCourse(!newCourse)}>
              {t('Добавить регламент')}
            </button>
          )}
        </div>
        {newCourse && (
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
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
              />
            </label>

            <p>
              {t(
                'На следующем шаге добавьте материалы и проверьте план. Обязанности и навыки должности будут учтены при генерации.',
              )}
            </p>
            <button className={styles.primary} disabled={busy}>
              {t('Перейти к материалам и настройкам')}
            </button>
          </form>
        )}
        {error && (
          <p className={css.error} role='alert'>
            {t(error)}
          </p>
        )}
        {message && (
          <p className={css.success} role='status'>
            {message}
          </p>
        )}
        {assigning && (
          <div className={styles.panel}>
            <h3>{assigning.name}</h3>
            <p>
              {t(
                'Назначить опубликованный регламент всем действующим сотрудникам этой должности? Уже выданные назначения и результаты сохранятся. Повторное назначение включит новых сотрудников.',
              )}
            </p>
            <div className={css.actions}>
              <button className={styles.primary} disabled={busy} onClick={() => void assign()}>
                {t('Назначить регламент')}
              </button>
              <button
                className={styles.secondary}
                disabled={busy}
                onClick={() => setAssigning(null)}
              >
                {t('Отмена')}
              </button>
            </div>
          </div>
        )}
        {courses.loading && <LoadingState>{t('Загрузка…')}</LoadingState>}
        {!!courses.error && <RequestError error={courses.error} onRetry={() => void courses.reload()} />}
        {!courses.loading && courses.data?.items.length === 0 && (
          <p>{t('Для этой должности пока нет регламентов')}</p>
        )}
        {courses.data?.items.map((course) => (
          <article className={css.course} key={course.id}>
            <div>
              <h3>{course.name}</h3>
              <p>
                {t(
                  statuses[
                    course.publication_status === 'published' ? 'published' : course.status
                  ] ?? course.status,
                )}
              </p>
            </div>
            <div className={css.actions}>
              {!position.is_archived && <button className={styles.secondary} disabled={course.status === 'generating' || busy} onClick={() => setRenaming({ kind: 'course', id: course.id, courseId: course.id, title: course.name, description: course.description, revision: course.content_revision })}>{t('Переименовать')}</button>}
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
              <Link className={styles.secondary} to={`/learning-analytics?course_id=${course.id}`}>{t('Результаты сотрудников')}</Link>
              {course.publication_status === 'published' && !position.is_archived && (
                <button
                  className={styles.primary}
                  disabled={busy}
                  onClick={() => setAssigning(course)}
                >
                  {t('Назначить сотрудникам')}
                </button>
              )}
            </div>
          </article>
        ))}
        <Pager offset={offset} total={courses.data?.total ?? 0} onChange={setOffset} />
        {renaming && <EntityEditor entity={renaming} onClose={() => setRenaming(null)} onSaved={() => { setRenaming(null); void courses.reload(); }} />}
        {editPosition && <PositionEditor position={position} onClose={() => setEditPosition(false)} onSaved={async () => { await onRefresh(); setEditPosition(false); }} />}
      </section>
    </div>
  );
}
