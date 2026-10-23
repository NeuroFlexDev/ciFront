import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { LoadingState, RequestError } from '@/Components/RequestState';
import { useLocale } from '@/i18n/useLocale';
import { useLearningData } from '@/Pages/Learning/useLearningData';
import type { LearningDashboardData } from '@/Pages/Workspace/LearningDashboard';
import css from './business.module.css';
import s from './businessDashboard.module.css';

type Metrics = {
  assigned: number;
  completed: number;
  in_progress: number;
  pending_reviews: number;
  overdue: number;
};
export type BusinessOverview = {
  scope: 'company' | 'team';
  company_name: string;
  employees: number;
  candidates: number;
  unassigned: number;
  metrics: Metrics;
  managers: (Metrics & {
    id: number;
    full_name: string;
    email: string;
    is_active: boolean;
    employees: number;
    candidates: number;
  })[];
};

export default function BusinessDashboard({ data }: { data: BusinessOverview }) {
  const { t, locale } = useLocale();
  const [days, setDays] = useState(30);
  const [activityDays, setActivityDays] = useState(7);
  const query = useLearningData<LearningDashboardData>(
    `/learning/dashboard?days=${days}&activity_days=${activityDays}`,
  );
  const metrics = query.data?.metrics;
  const daily = query.data?.daily ?? [];
  const maxActivity = Math.max(1, ...daily.map((day) => day.submitted_attempts));
  const number = (value: number) =>
    value.toLocaleString(locale === 'en' ? 'en-GB' : 'ru-RU', { maximumFractionDigits: 1 });
  const percent = (value: number | null | undefined) => (value == null ? '—' : `${number(value)}%`);
  const totalPercent = data.metrics.assigned
    ? Math.round((data.metrics.completed / data.metrics.assigned) * 100)
    : null;
  const date = (value: string, weekday = false) =>
    new Date(`${value}T12:00:00Z`).toLocaleDateString(
      locale === 'en' ? 'en-GB' : 'ru-RU',
      weekday
        ? { weekday: 'short', timeZone: 'UTC' }
        : { day: 'numeric', month: 'short', timeZone: 'UTC' },
    );
  const period = (
    label: string,
    value: number,
    values: number[],
    change: (value: number) => void,
  ) => (
    <label className={s.period}>
      <span className={s.srOnly}>{t(label)}</span>
      <select value={value} onChange={(event) => change(Number(event.target.value))}>
        {values.map((option) => (
          <option key={option} value={option}>
            {t('{v0} дней', { v0: option })}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className={s.dashboard}>
      {!!query.error && <RequestError error={query.error} onRetry={() => void query.reload()} />}
      {query.loading && !metrics && (
        <div className={s.srOnly}>
          <LoadingState>{t('Собираем результаты…')}</LoadingState>
        </div>
      )}
      <div className={s.grid}>
        <section
          className={`${s.card} ${s.completion}`}
          aria-label={t('Завершение за период')}
          aria-busy={query.loading}
        >
          <header>
            <h2>{t('Завершение')}</h2>
            {period('Период назначений', days, [7, 30, 90, 365], setDays)}
          </header>
          <div
            className={s.halfGauge}
            role='img'
            aria-label={
              metrics
                ? t('Завершено {v0} из {v1} назначений', {
                    v0: metrics.completed_in_period,
                    v1: metrics.assignments_in_period,
                  })
                : t('Показатели загружаются')
            }
          >
            <svg viewBox='0 0 400 220' aria-hidden='true'>
              <path d='M 16 204 A 184 184 0 0 1 384 204' pathLength='100' className={s.track} />
              {metrics?.completion_percent != null && (
                <path
                  d='M 16 204 A 184 184 0 0 1 384 204'
                  pathLength='100'
                  strokeDasharray={`${metrics.completion_percent} 100`}
                  className={s.fill}
                />
              )}
            </svg>
            <div className={s.gaugeValue}>
              <span className={s.pill}>
                {!metrics
                  ? '—'
                  : metrics.assignments_in_period
                    ? t('{v0} из {v1}', {
                        v0: metrics.completed_in_period,
                        v1: metrics.assignments_in_period,
                      })
                    : t('Нет назначений')}
              </span>
              <strong>{percent(metrics?.completion_percent)}</strong>
            </div>
          </div>
        </section>
        <section
          className={`${s.card} ${s.regulations}`}
          aria-label={t('Показатели регламентов')}
          aria-busy={query.loading}
        >
          <header>
            <h2>{t('Регламенты')}</h2>
            <Link className={s.roundLink} to='/courses' aria-label={t('Открыть регламенты')}>
              <ArrowUpRight size={23} />
            </Link>
          </header>
          <div className={s.regulationMetrics}>
            <div>
              <span>{t('Среднее время до завершения')}</span>
              <strong>
                {metrics?.average_completion_hours == null ? (
                  '—'
                ) : (
                  <>
                    {number(metrics.average_completion_hours)}
                    <small>{t('ч')}</small>
                  </>
                )}
              </strong>
              <p>{t('С момента назначения')}</p>
              <div className={s.ticks} aria-hidden='true' />
            </div>
            <div className={s.accentMetric}>
              <span>{t('Регламентов компании')}</span>
              <strong>{metrics ? number(metrics.courses) : '—'}</strong>
              <div className={s.ticks} aria-hidden='true' />
            </div>
            <div>
              <span>{t('Завершено назначений')}</span>
              <strong>{metrics ? number(metrics.completed_in_period) : '—'}</strong>
              <p>{t('Из выданных за {v0} дней', { v0: days })}</p>
              <div className={s.ticks} aria-hidden='true' />
            </div>
          </div>
        </section>
        <section className={`${s.card} ${s.assistant}`}>
          <header>
            <h2>{t('ИИ-ассистент')}</h2>
            <Link className={s.roundLink} to='/ai-helper' aria-label={t('Открыть помощника')}>
              <ArrowUpRight size={23} />
            </Link>
          </header>
          <div className={s.assistantBody}>
            <img src='/images/learning-assistant.webp' alt='' width='100' height='100' />
            <h3>{t('С чего начнём подготовку?')}</h3>
            <p>{t('Соберите регламент из рабочих материалов.')}</p>
          </div>
          <Link className={s.assistantHint} to='/ai-helper'>
            {t('Обсудить с помощником')}
          </Link>
          <Link className={s.assistantAction} to='/company?tab=positions'>
            <span>{t('Создать регламент')}</span>
            <span className={s.roundLink}>
              <ArrowUpRight size={20} />
            </span>
          </Link>
        </section>
        <section className={`${s.card} ${s.people}`} aria-label={t('Сотрудники')}>
          <header>
            <h2>{t('Сотрудники')}</h2>
            <Link
              className={s.roundLink}
              to='/company?tab=employees'
              aria-label={t('Открыть сотрудников')}
            >
              <ArrowUpRight size={23} />
            </Link>
          </header>
          <strong className={s.largeNumber}>{number(data.employees)}</strong>
          <Link className={s.candidates} to='/company?tab=candidates'>
            {t('Кандидаты')}: {number(data.candidates)} <ArrowUpRight size={13} />
          </Link>
        </section>
        <section className={`${s.card} ${s.progress}`}>
          <Link
            className={s.circleGauge}
            to='/learning-analytics'
            aria-label={t('Регламенты изучены: {v0} из {v1}. Открыть результаты', {
              v0: data.metrics.completed,
              v1: data.metrics.assigned,
            })}
          >
            <svg viewBox='0 0 240 240' aria-hidden='true'>
              <circle cx='120' cy='120' r='110' className={s.track} />
              {totalPercent !== null && (
                <circle
                  cx='120'
                  cy='120'
                  r='110'
                  pathLength='100'
                  strokeDasharray={`${totalPercent} 100`}
                  transform='rotate(-90 120 120)'
                  className={s.fill}
                />
              )}
            </svg>
            <div>
              <strong>{percent(totalPercent)}</strong>
              <span>{t('Регламенты изучены')}</span>
              <small>{t('Все назначения')}</small>
            </div>
          </Link>
        </section>
        <section
          className={`${s.card} ${s.activity}`}
          aria-label={t('Активность команды')}
          aria-busy={query.loading}
        >
          <header>
            <h2>{t('Активность')}</h2>
            {period('Период активности', activityDays, [7, 14, 30], setActivityDays)}
          </header>
          <strong className={s.activityTotal}>
            {metrics ? number(metrics.submitted_attempts) : '—'} <small>{t('ответов')}</small>
          </strong>
          <figure className={s.chart}>
            <figcaption className={s.srOnly}>
              {t('Отправленные ответы за {v0} дней', { v0: activityDays })}
            </figcaption>
            <div className={s.columns}>
              {daily.map((day, index) => (
                <div className={s.column} key={day.date}>
                  <div
                    className={`${s.bar} ${day.submitted_attempts === maxActivity ? s.highlight : ''}`}
                    style={{ height: `${(day.submitted_attempts / maxActivity) * 100}%` }}
                    title={`${date(day.date)}: ${day.submitted_attempts}`}
                  >
                    <span className={s.srOnly}>
                      {date(day.date)}: {day.submitted_attempts}
                    </span>
                  </div>
                  <span className={s.day}>
                    {activityDays === 7
                      ? date(day.date, true)
                      : index === 0 || index === daily.length - 1 || index % 7 === 0
                        ? date(day.date)
                        : ''}
                  </span>
                </div>
              ))}
            </div>
            {metrics && !metrics.submitted_attempts && (
              <p className={s.chartEmpty}>
                {t('Ответов пока нет')}
                <span>{t('Они появятся после первого теста.')}</span>
              </p>
            )}
          </figure>
        </section>
      </div>
      <div className={s.footer}>
        <span>
          {data.company_name} · {t(data.scope === 'company' ? 'Вся компания' : 'Моя команда')}
        </span>
        <Link to='/learning-analytics'>
          {data.metrics.pending_reviews
            ? t('Ожидают проверки: {v0}', { v0: data.metrics.pending_reviews })
            : t('Открыть результаты')}{' '}
          <ArrowUpRight size={15} />
        </Link>
        {data.metrics.overdue > 0 && (
          <Link to='/learning-analytics'>
            {t('Пропущен срок')}: {data.metrics.overdue}
          </Link>
        )}
      </div>
      {data.scope === 'company' && (
        <section className={css.positionDetail}>
          <div className={css.toolbar}>
            <h2>{t('Руководители и их команды')}</h2>
            <Link className={css.backLink} to='/company?tab=managers'>
              {t('Управлять руководителями')} ↗
            </Link>
          </div>
          {data.unassigned > 0 && (
            <p className={css.teamNotice}>
              {t('Без руководителя')}: <strong>{data.unassigned}</strong>.{' '}
              {t('Назначьте ответственного во вкладке сотрудников или кандидатов.')}
            </p>
          )}
          {data.managers.length ? (
            <div className={css.tableWrap}>
              <table className={css.table}>
                <thead>
                  <tr>
                    <th>{t('Руководитель')}</th>
                    <th>{t('Сотрудники')}</th>
                    <th>{t('Кандидаты')}</th>
                    <th>{t('Завершено / назначено')}</th>
                    <th>{t('Команда')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.managers.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.full_name || m.email}</strong>
                        <small>
                          {m.email}
                          {!m.is_active ? ` · ${t('Приостановлен')}` : ''}
                        </small>
                      </td>
                      <td>{m.employees}</td>
                      <td>{m.candidates}</td>
                      <td>
                        {m.completed} / {m.assigned}
                      </td>
                      <td>
                        <Link to={`/company?tab=employees&manager_id=${m.id}`}>
                          {t('Сотрудники')} ↗
                        </Link>
                        <br />
                        <Link to={`/company?tab=candidates&manager_id=${m.id}`}>
                          {t('Кандидаты')} ↗
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>{t('Добавьте первого руководителя и назначьте ему сотрудников или кандидатов.')}</p>
          )}
        </section>
      )}
    </div>
  );
}
