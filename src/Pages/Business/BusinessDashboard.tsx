import { Link } from 'react-router-dom';
import { ArrowUpRight, Users, UserRoundCheck, ClipboardCheck, Clock3 } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import css from './business.module.css';

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
  const { t } = useLocale();
  const { metrics } = data;
  return (
    <div className={css.dashboard}>
      <div className={css.overviewHeading}>
        <div>
          <span className={css.eyebrow}>{data.company_name}</span>
          <h2>
            {t(data.scope === 'company' ? 'Подготовка всей компании' : 'Подготовка моей команды')}
          </h2>
        </div>
        <Link to='/learning-analytics'>
          {t('Открыть результаты')} <ArrowUpRight size={18} />
        </Link>
      </div>
      <section className={css.metrics} aria-label={t('Показатели команды')}>
        <Link to='/company?tab=employees' className={css.metric}>
          <Users size={22} />
          <span>{t('Сотрудники')}</span>
          <strong>{data.employees}</strong>
        </Link>
        <Link to='/company?tab=candidates' className={css.metric}>
          <UserRoundCheck size={22} />
          <span>{t('Кандидаты')}</span>
          <strong>{data.candidates}</strong>
        </Link>
        <Link to='/learning-analytics' className={css.metric}>
          <ClipboardCheck size={22} />
          <span>{t('Регламенты изучены')}</span>
          <strong>
            {metrics.completed}
            <em> / {metrics.assigned}</em>
          </strong>
          <progress
            aria-label={t('Регламенты изучены')}
            value={metrics.completed}
            max={Math.max(1, metrics.assigned)}
          />
          <small>
            {metrics.assigned
              ? `${Math.round((metrics.completed / metrics.assigned) * 100)}% ${t('завершено')}`
              : t('Пока нет назначений')}
          </small>
        </Link>
        <Link to='/learning-analytics' className={css.metric}>
          <Clock3 size={22} />
          <span>{t('Пропущен срок')}</span>
          <strong>{metrics.overdue}</strong>
          <small>
            {t('Ожидают проверки')}: {metrics.pending_reviews}
          </small>
        </Link>
      </section>
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
      {!metrics.assigned && (
        <section className={css.empty}>
          <h2>{t('Начните с должности')}</h2>
          <p>
            {t('Соберите рабочие инструкции и пригласите сотрудников. Результаты появятся здесь.')}
          </p>
          <Link to='/company?tab=positions' className={css.backLink}>
            {t('Открыть должности')} ↗
          </Link>
        </section>
      )}
    </div>
  );
}
