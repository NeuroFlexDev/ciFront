import AnalyticsSummary from './AnalyticsSummary';
import { useLocale } from '@/i18n/useLocale';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '@/shared/api';
import { ApiError } from '@/shared/errors';
import { Shell } from '@/Pages/Workspace/shared';
import { LoadingState, RequestError } from '@/Components/RequestState';
import { useLearningData } from '../Learning/useLearningData';
import { type Assignment, dateLabel, stateLabel } from '../Learning/types';
import { ActionStatus, useTeamAction } from './TeamTools';
import { type Group, type Team } from './types';
import s from '../Learning/learning.module.css';

type Report = {
  items: Assignment[];
  metrics: {
    assigned: number;
    completed: number;
    in_progress: number;
    overdue: number;
    pending_reviews: number;
    average_score_percent: number | null;
  };
};
export default function LearningAnalytics() {
  const { t } = useLocale();

  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const course = params.get('course_id') ?? '';
  const group = params.get('group_id') ?? '';
  const user = params.get('user_id') ?? '';
  const filters = new URLSearchParams();
  if (course) filters.set('course_id', course);
  if (group) filters.set('group_id', group);
  if (user) filters.set('user_id', user);
  const report = useLearningData<Report>('/team/results?' + filters);
  const all = useLearningData<Report>('/team/results');
  const team = useLearningData<Team>('/team');
  const groups = useLearningData<{ items: Group[] }>('/team/groups');
  const reminders = useLearningData<{ items: Assignment[] }>('/team/learning-reminders');
  const action = useTeamAction();
  const choose = (key: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  const courses = Array.from(
    new Map(
      (all.data?.items ?? []).map((a) => [a.course_id, { id: a.course_id, title: a.title }]),
    ).values(),
  );
  const visible = (report.data?.items ?? []).filter((a) =>
    (a.full_name + ' ' + a.email + ' ' + a.title).toLowerCase().includes(query.toLowerCase()),
  );
  const exportResults = () =>
    void action.run(async () => {
      const response = await apiFetch('/team/results/export?' + filters);
      if (!response.ok)
        throw new ApiError(
          t('Не удалось подготовить выгрузку. Повторите запрос.'),
          response.status,
          'http',
        );
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'learning-results.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, t('Выгрузка подготовлена с выбранными фильтрами'));
  return (
    <Shell
      title={t('Аналитика обучения')}
      description={t('Подтверждённые назначения и оценки в вашей области ответственности.')}
    >
      <div className={s.page}>
        {[report, all, team, groups, reminders].map((r, i) =>
          r.error ? <RequestError key={i} error={r.error} onRetry={() => void r.reload()} /> : null,
        )}
        {report.loading && !report.data && <LoadingState>{t('Собираем результаты…')}</LoadingState>}
        {report.data && (
          <>
            <div className={`${s.formGrid} ${s.analyticsFilters}`}>
              <label className={s.field}>
                {t('Курс')}
                <select value={course} onChange={(e) => choose('course_id', e.target.value)}>
                  <option value=''>{t('Все доступные курсы')}</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className={s.field}>
                {t('Группа')}
                <select value={group} onChange={(e) => choose('group_id', e.target.value)}>
                  <option value=''>{t('Все группы')}</option>
                  {groups.data?.items.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={s.field}>
                {t('Участник')}
                <select value={user} onChange={(e) => choose('user_id', e.target.value)}>
                  <option value=''>{t('Все участники')}</option>
                  {team.data?.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className={s.field}>
                {t('Поиск')}
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('Имя, почта или курс')}
                />
              </label>
            </div>
            <section className={s.analyticsStats} aria-label={t('Сводка обучения')}>
              {[
                ['Назначено', report.data.metrics.assigned],
                ['В процессе', report.data.metrics.in_progress],
                ['Завершили', report.data.metrics.completed],
                ['Просрочили', report.data.metrics.overdue],
                ['На проверке', report.data.metrics.pending_reviews],
              ].map(([label, value]) => (
                <div className={s.stat} key={label}>
                  <span>{t(String(label))}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </section>
            <AnalyticsSummary items={report.data.items} groups={groups.data?.items ?? []} />
            <div className={s.card}>
              <div className={s.spread}>
                <h2>{t('Назначения и результаты')}</h2>
                <button
                  className={s.primary}
                  disabled={action.busy || !report.data.items.length}
                  onClick={exportResults}
                >
                  {t('Скачать CSV ↓')}
                </button>
              </div>
              <p className={s.caption}>
                {t('В процессе:') + ' '}
                {report.data.metrics.in_progress}
                {t('. Просрочено:')} {report.data.metrics.overdue}
                {t(
                  '. Отозванные назначения остаются в истории и не учитываются в активной сводке.',
                )}
              </p>
              <ActionStatus action={action} />
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>{t('Участник')}</th>
                      <th>{t('Курс / версия')}</th>
                      <th>{t('Прогресс')}</th>
                      <th>{t('Результат')}</th>
                      <th>{t('Статус и срок')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.full_name || a.email}</strong>
                          <p className={s.caption}>{a.email}</p>
                        </td>
                        <td>
                          {a.title}
                          <p className={s.caption}>
                            {t('Версия') + ' '}
                            {a.revision}
                            {' ' + t('· назначение') + ' '}
                            {a.id}
                          </p>
                        </td>
                        <td>
                          {a.progress_percent}%
                          <progress
                            className={s.progress}
                            max={100}
                            value={a.progress_percent}
                            aria-label={t('Прогресс {v0}', {
                              v0: a.full_name ?? a.email ?? String(a.user_id),
                            })}
                          />
                        </td>
                        <td>
                          {a.max_points
                            ? `${a.points} / ${a.max_points}`
                            : t('Без балльной оценки')}
                          <p className={s.caption}>
                            {a.score_percent !== null ? `${a.score_percent}%` : ''}
                            {a.pending_reviews
                              ? t(' · На проверке: {v0}', {
                                  v0: a.pending_reviews,
                                })
                              : ''}
                          </p>
                        </td>
                        <td>
                          <span className={s.badge}>
                            {t(stateLabel[a.status] ?? String(a.status)) ?? a.status}
                          </span>
                          <p className={s.caption}>
                            {a.completed_at
                              ? t('Завершено: ') + dateLabel(a.completed_at)
                              : t('Срок: ') + dateLabel(a.due_at)}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!visible.length && (
                <div className={s.empty}>
                  <h3>
                    {report.data.items.length
                      ? t('По вашему поиску ничего не найдено')
                      : t('Назначений с такими условиями нет')}
                  </h3>
                  <p>{t('Измените фильтры или назначьте участникам опубликованный курс.')}</p>
                  <Link className={s.secondary} to='/assignments'>
                    {t('К назначениям')}
                  </Link>
                </div>
              )}
            </div>
            <section className={s.card} style={{ marginTop: 28 }}>
              <h2>{t('Ближайшие сроки и просроченные назначения')}</h2>
              <p className={s.muted}>
                {t(
                  'Для программ учитывается интервал предупреждения из назначенной редакции; для отдельных курсов — три дня.',
                )}
              </p>
              {reminders.data?.items.length ? (
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>{t('Участник')}</th>
                        <th>{t('Курс')}</th>
                        <th>{t('Срок')}</th>
                        <th>{t('Прогресс')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reminders.data.items.map((a) => (
                        <tr key={a.id}>
                          <td>
                            {team.data?.members.find((m) => m.id === a.user_id)?.full_name ||
                              t('Участник {v0}', { v0: a.user_id })}
                          </td>
                          <td>{a.title}</td>
                          <td>{dateLabel(a.due_at)}</td>
                          <td>{a.progress_percent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={s.muted}>{t('Назначений с приближающимся сроком нет.')}</p>
              )}
            </section>
          </>
        )}
      </div>
    </Shell>
  );
}
