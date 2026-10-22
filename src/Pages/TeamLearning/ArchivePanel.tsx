import { useLocale } from '@/i18n/useLocale';
import { api } from '@/shared/api';
import { LoadingState, RequestError } from '@/Components/RequestState';
import { useLearningData } from '../Learning/useLearningData';
import { ActionStatus, useTeamAction } from './TeamTools';
import s from '../Learning/learning.module.css';
import { useState } from 'react';
import type { ProgramEnrollment } from '../Learning/types';
import { ManagementCapabilityNotice } from './ManagementCapability';
import { useManagementCapability } from './useManagementCapability';

type ArchivedItem = { id: number; name?: string; title?: string; description?: string; state_token?: string; revision?: number };
export default function ArchivePanel({ kind, onRestored }: {
  kind: 'groups' | 'departments' | 'programs'; onRestored: () => Promise<void>;
}) {
  const { t } = useLocale();
  const capability = useManagementCapability();
  const data = useLearningData<{ items: ArchivedItem[] }>(capability.supported ? `/team/${kind}?archived=true` : null);
  const action = useTeamAction();
  const [history, setHistory] = useState<number | null>(null);
  return <section className={s.stack} aria-label={t('Архив')}>
    <h2>{t('Архив')}</h2>
    <ManagementCapabilityNotice capability={capability} />
    <p className={s.muted}>{t('Восстановление сохраняет историю. Старые автоматические назначения групп не включаются повторно; новые назначения создаются отдельно.')}</p>
    {!!data.error && <RequestError error={data.error} onRetry={() => void data.reload()} />}
    <ActionStatus action={action} />
    {data.loading && !data.data && <LoadingState>{t('Загружаем архив…')}</LoadingState>}
    <button className={s.secondary} disabled={!capability.supported || action.busy || data.loading} onClick={() => void data.reload()}>{t('Обновить архив')}</button>
    <div className={s.grid}>{data.data?.items.map(row => <article className={s.card} key={row.id}>
      <h3>{row.name || row.title}</h3>{row.description && <p>{row.description}</p>}
      <button className={s.primary} disabled={!capability.supported || action.busy} onClick={() => void action.run(async () => {
        await api.post(`/team/${kind}/${row.id}/restore`, kind === 'programs'
          ? { expected_revision: row.revision } : { expected_state: row.state_token });
        await Promise.all([data.reload(), onRestored()]);
      }, t('Запись восстановлена. История сохранена.'))}>{t('Восстановить')}</button>
      {kind === 'programs' && <button className={s.secondary} aria-expanded={history === row.id}
        onClick={() => setHistory(history === row.id ? null : row.id)}>{t('История назначений')}</button>}
      {kind === 'programs' && history === row.id && <ArchivedProgramHistory programId={row.id} />}
    </article>)}</div>
    {data.data && !data.data.items.length && <p className={s.muted}>{t('Архив пуст.')}</p>}
  </section>;
}

function ArchivedProgramHistory({ programId }: { programId: number }) {
  const { t } = useLocale();
  const history = useLearningData<{ items: ProgramEnrollment[] }>(`/team/programs/${programId}/enrollments`);
  return <div className={s.stack}>
    {!!history.error && <RequestError error={history.error} onRetry={() => void history.reload()} />}
    {history.loading && !history.data && <LoadingState>{t('Загружаем назначения…')}</LoadingState>}
    {history.data?.items.map(row => <section key={row.id}>
      <h4>{t('Участник {v0}', { v0: row.user_id })} · {t('Редакция')} {row.program_revision}</h4>
      {row.assignments.map(assignment => <p key={assignment.id}>{assignment.title} · {assignment.progress_percent}%</p>)}
    </section>)}
    {history.data && !history.data.items.length && <p>{t('Программа пока никому не назначена.')}</p>}
  </div>;
}
