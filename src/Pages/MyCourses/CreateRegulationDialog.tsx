import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Dialog from '@/Components/Admin/AdminDialog';
import DraftNotice from '@/Components/DraftNotice';
import { LoadingState, RequestError } from '@/Components/RequestState';
import { useDurableState } from '@/hooks/useDurableState';
import { useLocale } from '@/i18n/useLocale';
import { api } from '@/shared/api';
import { useLearningData } from '../Learning/useLearningData';
import { styles } from '../Workspace/shared';
import css from '../Business/business.module.css';
type Position = { id: number; name: string; revision: number };
export default function CreateRegulationDialog({
  mode,
  onClose,
}: {
  mode: 'files' | 'assistant';
  onClose: () => void;
}) {
  const { t } = useLocale(),
    navigate = useNavigate(),
    [offset, setOffset] = useState(0);
  const positions = useLearningData<{ items: Position[]; total: number }>(
    `/business/positions?offset=${offset}&limit=20`,
  );
  const [form, setForm, clearDraft] = useDurableState('regulation-from-catalogue-' + mode, {
    position_id: '',
    title: '',
    goal: '',
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const selected = positions.data?.items.find((p) => p.id === Number(form.position_id));
  async function create(event: FormEvent) {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ course_id: number; url: string }>(
        `/business/positions/${selected.id}/regulations`,
        {
          title: form.title.trim(),
          goal: form.goal.trim(),
          language: 'ru',
          expected_position_revision: selected.revision,
        },
      );
      clearDraft(form);
      navigate(mode === 'assistant' ? `/ai-helper?course=${data.course_id}` : data.url);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={t(mode === 'files' ? 'Добавить готовый регламент' : 'Создать регламент с ИИ')}
      busy={busy}
      onClose={onClose}
      className={css.modal}
    >
      <p>
        {t(
          mode === 'files'
            ? 'Выберите должность и название. На следующем шаге загрузите документы: по ним подготовим регламент и проверочные вопросы.'
            : 'Опишите задачу и выберите должность. Помощник поможет собрать инструкцию; перед публикацией вы сможете всё отредактировать.',
        )}
      </p>
      <form className={css.form} onSubmit={(event) => void create(event)}>
        <DraftNotice />
        {positions.loading && <LoadingState />}
        {!!(positions.error || error) && (
          <RequestError error={positions.error || error} onRetry={() => void positions.reload()} />
        )}
        <label>
          {t('Должность')}
          <select
            required
            value={form.position_id}
            disabled={busy || positions.loading}
            onChange={(event) => setForm({ ...form, position_id: event.target.value })}
          >
            <option value=''>{t('Выберите должность')}</option>
            {positions.data?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {(positions.data?.total || 0) > 20 && (
          <div className={css.actions}>
            <button
              type='button'
              disabled={!offset || busy}
              onClick={() => {
                setOffset(offset - 20);
                setForm({ ...form, position_id: '' });
              }}
            >
              {t('Предыдущие должности')}
            </button>
            <button
              type='button'
              disabled={offset + 20 >= (positions.data?.total || 0) || busy}
              onClick={() => {
                setOffset(offset + 20);
                setForm({ ...form, position_id: '' });
              }}
            >
              {t('Следующие должности')}
            </button>
          </div>
        )}
        {positions.data && !positions.data.items.length && (
          <p>
            {t('Сначала добавьте должность, для которой создаётся инструкция.')}{' '}
            <Link to='/company?tab=positions'>{t('Открыть должности')}</Link>
          </p>
        )}
        <label>
          {t('Название регламента')}
          <input
            required
            maxLength={200}
            value={form.title}
            disabled={busy}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </label>
        <label>
          {t('Что регулирует документ')}
          <textarea
            required
            value={form.goal}
            maxLength={2000}
            disabled={busy}
            onChange={(event) => setForm({ ...form, goal: event.target.value })}
          />
        </label>
        <button
          className={styles.primary}
          disabled={busy || !selected || !form.title.trim() || !form.goal.trim()}
        >
          {t(
            busy
              ? 'Создаём…'
              : mode === 'files'
                ? 'Перейти к загрузке документов'
                : 'Открыть помощника',
          )}
        </button>
      </form>
    </Dialog>
  );
}
