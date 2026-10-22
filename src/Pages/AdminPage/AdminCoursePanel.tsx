import { useState, type FormEvent, type ReactNode } from 'react';
import { useDurableState } from '@/hooks/useDurableState';
import { useLocale } from '@/i18n/useLocale';
import { api } from '@/shared/api';
import { RequestError } from '@/Components/RequestState';
import { styles as workspaceStyles, statuses } from '@/Pages/Workspace/shared';
import adminStyles from './admin.module.css';
import type { Member } from './AdminPage';

const styles = { ...workspaceStyles, ...adminStyles };
export type ManagedCourse = {
  id: number;
  title: string | null;
  description: string;
  owner_id: number | null;
  organization_id: number | null;
  status: string;
  publication_status: string;
  content_revision: number;
  is_deleted: boolean;
  state_token: string;
};
type Draft = {
  id?: number;
  title: string;
  description: string;
  owner: string;
  expected_state?: string;
};

export default function AdminCoursePanel({
  courses,
  users,
  archived,
  setArchived,
  onChanged,
  userSearch,
  setUserSearch,
  capable = true,
  filters,
}: {
  courses: ManagedCourse[];
  users: Member[];
  archived: boolean;
  setArchived: (value: boolean) => void;
  onChanged: () => void;
  userSearch: string;
  setUserSearch: (value: string) => void;
  capable?: boolean;
  filters?: ReactNode;
}) {
  const { t } = useLocale();
  const [draft, setDraft] = useDurableState<Draft | null>('admin:course-metadata', null);
  const [confirm, setConfirm] = useState<ManagedCourse | null>(null);
  const [assign, setAssign] = useState<{ course: number; owner: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const [latest, setLatest] = useState<ManagedCourse | null>(null);
  async function perform(action: () => Promise<void>) {
    if (busy || !capable) return;
    setBusy(true);
    setError(null);
    setMessage('');
    try {
      await action();
      onChanged();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    void perform(async () => {
      const body = { title: draft.title, description: draft.description };
      if (draft.id)
        await api.put(`/admin/courses/${draft.id}`, {
          ...body,
          expected_state: draft.expected_state,
        });
      else await api.post('/admin/courses', { ...body, owner_id: Number(draft.owner) });
      setDraft(null);
      setMessage(t('Метаданные курса сохранены. Опубликованные версии не изменены.'));
    });
  }
  const ownerInput = (value: string, change: (value: string) => void) => (
    <>
      <label>
        {t('Поиск владельца')}
        <input
          type='search'
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          placeholder={t('Имя или email')}
        />
      </label>
      <label>
        {t('Владелец курса')}
        <select required value={value} onChange={(e) => change(e.target.value)}>
          <option value=''>{t('Выберите владельца')}</option>
          {users
            .filter((u) => u.is_active && !u.is_admin)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email} · {u.email}
              </option>
            ))}
        </select>
      </label>
    </>
  );
  return (
    <fieldset disabled={busy || !capable} className={styles.layoutReset}>
      <div className={styles.between}>
        <div className={styles.filterRow}>
        {filters}
        <label className={styles.check}>
          <input
            type='checkbox'
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          {t('Архив курсов')}
        </label>
        </div>
        <button
          className={styles.primary}
          disabled={!!draft}
          onClick={() => setDraft({ title: '', description: '', owner: '' })}
        >
          {t('Создать курс')}
        </button>
      </div>
      <p className={styles.muted}>
        {t(
          'Управляйте названием и доступностью курса. Содержимое уроков открывается только автору или по разрешению заказчика.',
        )}
      </p>
      {!!error && <RequestError error={error} onRetry={onChanged} />}
      {message && <p role='status'>{message}</p>}
      {draft && (
        <section className={styles.panel}>
          <h2>{draft.id ? t('Метаданные курса') : t('Новый курс')}</h2>
          <form className={styles.form} onSubmit={save}>
            {!!error && draft.id && (
              <div className={styles.span}>
                <button
                  type='button'
                  className={styles.secondary}
                  onClick={() =>
                    void perform(async () => {
                      const result = await api.get<ManagedCourse>(`/admin/courses/${draft.id}`);
                      setLatest(result.data);
                    })
                  }
                >
                  {t('Сравнить с текущей записью')}
                </button>
              </div>
            )}
            {latest && latest.id === draft.id && (
              <section className={styles.span}>
                <h3>{t('Текущая запись на сервере')}</h3>
                <p>{latest.title}</p>
                <p>{latest.description}</p>
                <button
                  type='button'
                  className={styles.secondary}
                  onClick={() => {
                    setDraft({ ...draft, expected_state: latest.state_token });
                    setLatest(null);
                  }}
                >
                  {t('Сохранить мои поля поверх этой версии')}
                </button>
                <p>{t('Затем нажмите сохранение. Ваш введённый текст останется в форме.')}</p>
              </section>
            )}
            {!draft.id && ownerInput(draft.owner, (owner) => setDraft({ ...draft, owner }))}
            <label className={styles.span}>
              {t('Название курса')}
              <input
                required
                maxLength={300}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label className={styles.span}>
              {t('Описание курса')}
              <textarea
                maxLength={10000}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </label>
            <p className={styles.span}>
              {t(
                'Изменение опубликованного курса откроет рабочую редакцию. Назначения и ответы учеников останутся на прежней версии.',
              )}
            </p>
            <div className={styles.row}>
              <button className={styles.primary}>{t('Сохранить курс')}</button>
              <button type='button' className={styles.secondary} onClick={() => setDraft(null)}>
                {t('Отмена')}
              </button>
            </div>
          </form>
        </section>
      )}
      {confirm && (
        <section className={styles.panel} role='region' aria-label={t('Подтверждение действия')}>
          <h2>
            {confirm.is_deleted ? t('Восстановить курс?') : t('Архивировать курс?')} {confirm.title}
          </h2>
          <p>
            {t(
              'Опубликованные версии, выданные назначения и результаты сохранятся. Восстановление проверяет владельца и лимит курсов.',
            )}
          </p>
          <div className={styles.row}>
            <button
              className={styles.primary}
              onClick={() =>
                void perform(async () => {
                  await api.post(
                    `/admin/courses/${confirm.id}/${confirm.is_deleted ? 'restore' : 'archive'}`,
                    { expected_state: confirm.state_token },
                  );
                  setConfirm(null);
                  setMessage(t('Состояние курса изменено. История сохранена.'));
                })
              }
            >
              {t('Подтвердить')}
            </button>
            <button className={styles.secondary} onClick={() => setConfirm(null)}>
              {t('Отмена')}
            </button>
          </div>
        </section>
      )}
      {assign && (
        <section className={styles.panel}>
          <h2>
            {t('Назначить владельца курса №')}
            {assign.course}
          </h2>
          <p>{t('Перенос доступен только для курса без владельца и связанных материалов.')}</p>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void perform(async () => {
                await api.post(`/admin/courses/${assign.course}/assign-owner`, {
                  user_id: Number(assign.owner),
                });
                setAssign(null);
                setMessage(t('Владелец курса назначен.'));
              });
            }}
          >
            {ownerInput(assign.owner, (owner) => setAssign({ ...assign, owner }))}
            <button className={styles.primary}>{t('Назначить владельца')}</button>
            <button type='button' className={styles.secondary} onClick={() => setAssign(null)}>
              {t('Отмена')}
            </button>
          </form>
        </section>
      )}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('Курс')}</th>
              <th>{t('Владелец')}</th>
              <th>{t('Состояние')}</th>
              <th>{t('Действия')}</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td>
                  {course.title || t('Без названия')}
                  <small>
                    №{course.id} · {t('Редакция')} {course.content_revision}
                  </small>
                </td>
                <td>
                  {course.owner_id === null
                    ? t('Не назначен')
                    : users.find((u) => u.id === course.owner_id)?.email ||
                      t('Пользователь №{v0}', { v0: course.owner_id })}
                </td>
                <td>
                  {course.is_deleted ? t('В архиве') : t(statuses[course.status] ?? course.status)}
                  <small>
                    {t(statuses[course.publication_status] ?? course.publication_status)}
                  </small>
                </td>
                <td>
                  <div className={styles.row}>
                    {!course.is_deleted && (
                      <button
                        className={styles.secondary}
                        disabled={!!draft || !course.state_token}
                        onClick={() =>
                          setDraft({
                            id: course.id,
                            title: course.title || '',
                            description: course.description || '',
                            owner: String(course.owner_id ?? ''),
                            expected_state: course.state_token,
                          })
                        }
                      >
                        {t('Изменить метаданные')}
                      </button>
                    )}
                    <button
                      className={course.is_deleted ? styles.secondary : styles.danger}
                      disabled={!course.state_token}
                      onClick={() => setConfirm(course)}
                    >
                      {t(course.is_deleted ? 'Восстановить' : 'Архивировать')}
                    </button>
                    {course.owner_id === null && !course.is_deleted && (
                      <button
                        className={styles.secondary}
                        onClick={() => setAssign({ course: course.id, owner: '' })}
                      >
                        {t('Назначить владельца')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!courses.length && <p className={styles.empty}>{t('Курсы в этом списке не найдены.')}</p>}
      </div>
    </fieldset>
  );
}
