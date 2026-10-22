import AdminDialog from '@/Components/Admin/AdminDialog';
import AdminToast from '@/Components/Admin/AdminToast';
import { useState } from 'react';
import { useDurableState } from '@/hooks/useDurableState';
import { useLocale } from '@/i18n/useLocale';
import { api } from '@/shared/api';
import { RequestError } from '@/Components/RequestState';
import { styles as workspaceStyles, dateText } from '@/Pages/Workspace/shared';
import adminStyles from './admin.module.css';

const styles = { ...workspaceStyles, ...adminStyles };
export type ManagedRequest = {
  reference: string;
  purpose: string;
  email: string;
  name: string;
  message: string;
  created_at: string;
  status: string;
  state_token: string;
  notes?: { id: number; text: string; created_at: string }[];
};
type RequestDraft = { purpose: string; email: string; name: string; message: string };

export default function AdminRequestPanel({
  requests,
  status,
  setStatus,
  onChanged,
  loading,
  capable = true,
}: {
  requests: ManagedRequest[];
  status: string;
  setStatus: (value: string) => void;
  onChanged: () => void;
  loading: boolean;
  capable?: boolean;
}) {
  const { t } = useLocale();
  const [draft, setDraft] = useDurableState<RequestDraft | null>('admin:incoming-request', null);
  const [edit, setEdit] = useDurableState<{
    row: ManagedRequest;
    status: string;
    note: string;
  } | null>('admin:request-workflow', null);
  const [archive, setArchive] = useState<ManagedRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const [latest, setLatest] = useState<ManagedRequest | null>(null);
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
  return (
    <fieldset disabled={busy || !capable} className={styles.layoutReset}>
      <div className={styles.between}>
        <label className={styles.search}>
          {t('Показывать')}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value='open'>{t('Открытые обращения')}</option>
            <option value='closed'>{t('Обработанные')}</option>
            <option value='archived'>{t('Архив обращений')}</option>
          </select>
        </label>
        <button
          className={styles.primary}
          disabled={!!draft}
          onClick={() => setDraft({ purpose: 'support', email: '', name: '', message: '' })}
        >
          {t('Записать обращение')}
        </button>
      </div>
      {!!error && !(draft || edit || archive) && <RequestError error={error} onRetry={onChanged} />}
      <AdminToast message={message} onClose={() => setMessage('')} />
      {draft && (
        <AdminDialog
          title={t('Входящее обращение')}
          onClose={() => setDraft(null)}
          busy={busy}
          guard
          className={styles.dialogScope}
        >
          {!!error && <RequestError error={error} />}
          <section className={styles.panel}>
            <p>
              {t(
                'Зафиксируйте уже полученное обращение. Эта запись не отправляет письмо и не создаёт согласие от имени клиента.',
              )}
            </p>
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void perform(async () => {
                  await api.post('/admin/requests', draft);
                  setDraft(null);
                  setStatus('open');
                  setMessage(t('Обращение записано.'));
                });
              }}
            >
              <label>
                {t('Имя')}
                <input
                  maxLength={160}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label>
                Email
                <input
                  required
                  type='email'
                  maxLength={255}
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
              </label>
              <label>
                {t('Тема обращения')}
                <select
                  value={draft.purpose}
                  onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
                >
                  <option value='support'>{t('Поддержка')}</option>
                  <option value='enquiry'>{t('Заявка')}</option>
                  <option value='rights'>{t('Персональные данные')}</option>
                </select>
              </label>
              <label className={styles.span}>
                {t('Текст обращения')}
                <textarea
                  required
                  minLength={10}
                  maxLength={5000}
                  value={draft.message}
                  onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                />
              </label>
              <div className={styles.row}>
                <button className={styles.primary}>{t('Сохранить обращение')}</button>
                <button
                  type='button'
                  data-dialog-close
                  className={styles.secondary}
                  onClick={() => setDraft(null)}
                >
                  {t('Отмена')}
                </button>
              </div>
            </form>
          </section>
        </AdminDialog>
      )}
      {edit && (
        <AdminDialog
          title={`${t('Обработка обращения')} · ${edit.row.name || edit.row.email}`}
          onClose={() => setEdit(null)}
          busy={busy}
          guard
          className={styles.dialogScope}
        >
          {!!error && <RequestError error={error} />}
          <section className={styles.panel}>
            <p style={{ whiteSpace: 'pre-wrap' }}>{edit.row.message}</p>
            <p>
              {t('Исходное сообщение сохраняется. Комментарии добавляются в историю действий.')}
            </p>
            {(edit.row.notes ?? []).map((note) => (
              <blockquote key={note.id}>
                <p>{note.text}</p>
                <small>{dateText(note.created_at)}</small>
              </blockquote>
            ))}
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void perform(async () => {
                  await api.put(`/admin/requests/${edit.row.reference}`, {
                    status: edit.status,
                    note: edit.note,
                    expected_state: edit.row.state_token,
                  });
                  setEdit(null);
                  setMessage(t('Обработка обращения сохранена.'));
                });
              }}
            >
              {!!error && (
                <button
                  type='button'
                  className={styles.secondary}
                  onClick={() =>
                    void perform(async () => {
                      const result = await api.get<ManagedRequest>(
                        `/admin/requests/${edit.row.reference}`,
                      );
                      setLatest(result.data);
                    })
                  }
                >
                  {t('Сравнить с текущей записью')}
                </button>
              )}
              {latest?.reference === edit.row.reference && (
                <section className={styles.span}>
                  <h3>{t('Текущая запись на сервере')}</h3>
                  <p>
                    {t(
                      latest.status === 'open'
                        ? 'Открыто'
                        : latest.status === 'closed'
                          ? 'Обработано'
                          : 'В архиве',
                    )}
                  </p>
                  {(latest.notes ?? []).map((note) => (
                    <p key={note.id}>{note.text}</p>
                  ))}
                  <button
                    type='button'
                    className={styles.secondary}
                    onClick={() => {
                      setEdit({ ...edit, row: latest });
                      setLatest(null);
                    }}
                  >
                    {t('Сохранить мои поля поверх этой версии')}
                  </button>
                  <p>{t('Затем нажмите сохранение. Ваш введённый текст останется в форме.')}</p>
                </section>
              )}
              <label>
                {t('Состояние')}
                <select
                  value={edit.status}
                  onChange={(e) => setEdit({ ...edit, status: e.target.value })}
                >
                  <option value='open'>{t('Открыто')}</option>
                  <option value='closed'>{t('Обработано')}</option>
                </select>
              </label>
              <label className={styles.span}>
                {t('Комментарий оператора')}
                <textarea
                  maxLength={2000}
                  value={edit.note}
                  onChange={(e) => setEdit({ ...edit, note: e.target.value })}
                />
              </label>
              <div className={styles.row}>
                <button className={styles.primary}>{t('Сохранить обработку')}</button>
                <button
                  type='button'
                  data-dialog-close
                  className={styles.secondary}
                  onClick={() => setEdit(null)}
                >
                  {t('Отмена')}
                </button>
              </div>
            </form>
          </section>
        </AdminDialog>
      )}
      {archive && (
        <AdminDialog
          title={t('Архивировать обращение?')}
          onClose={() => setArchive(null)}
          busy={busy}
          className={styles.dialogScope}
        >
          {!!error && <RequestError error={error} />}
          <section className={styles.panel} aria-label={t('Подтверждение действия')}>
            <p>
              {archive.name || archive.email} ·{' '}
              {t('Исходное сообщение и история сохранятся. Обращение можно будет восстановить.')}
            </p>
            <div className={styles.row}>
              <button
                className={styles.primary}
                onClick={() =>
                  void perform(async () => {
                    await api.post(`/admin/requests/${archive.reference}/archive`, {
                      expected_state: archive.state_token,
                    });
                    setArchive(null);
                  })
                }
              >
                {t('Подтвердить')}
              </button>
              <button className={styles.secondary} onClick={() => setArchive(null)}>
                {t('Отмена')}
              </button>
            </div>
          </section>
        </AdminDialog>
      )}
      {requests.map((row) => (
        <section className={styles.panel} key={row.reference}>
          <h2>{row.name || row.email}</h2>
          <p>
            {row.email} · {dateText(row.created_at)}
          </p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{row.message}</p>
          <p>
            {t('Номер:')} {row.reference}
          </p>
          <div className={styles.row}>
            <button
              className={styles.secondary}
              disabled={!!edit || !row.state_token}
              onClick={() =>
                void perform(async () => {
                  const result = await api.get<ManagedRequest>(`/admin/requests/${row.reference}`);
                  setEdit({
                    row: result.data,
                    status: result.data.status === 'archived' ? 'open' : result.data.status,
                    note: '',
                  });
                })
              }
            >
              {t(row.status === 'archived' ? 'Восстановить и обработать' : 'Обработать обращение')}
            </button>
            {row.status === 'closed' && (
              <button className={styles.danger} onClick={() => setArchive(row)}>
                {t('Архивировать')}
              </button>
            )}
          </div>
        </section>
      ))}
      {!requests.length && !loading && (
        <p className={styles.empty}>{t('Обращений в этом списке нет.')}</p>
      )}
    </fieldset>
  );
}
