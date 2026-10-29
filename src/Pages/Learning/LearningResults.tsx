import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '@/i18n/useLocale';
import { api } from '@/shared/api';
import { Shell, styles } from '../Workspace/shared';
import { LoadingState, RequestError } from '@/Components/RequestState';
import { useLearningData } from './useLearningData';
import type { Assignment, LearnerResponse } from './types';
import s from './results.module.css';

type Result = LearnerResponse & { assignment: Assignment };
export default function LearningResults() {
  const { t, locale } = useLocale();
  const [page, setPage] = useState(0);
  const [version, setVersion] = useState(0);
  const assignments = useLearningData<{ items: Assignment[]; total: number }>(
    `/learning/assignments?include_history=true&offset=${page * 24}&limit=24`,
  );
  const [rows, setRows] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let active = true;
    setRows([]);
    setError(null);
    if (!assignments.data) {
      setLoading(false);
      return;
    }
    const items = assignments.data.items;
    setLoading(true);
    Promise.all(
      items.map(async (assignment) => {
        const { data } = await api.get<Assignment & { responses: LearnerResponse[] }>(
          `/learning/assignments/${assignment.id}/results`,
        );
        return data.responses
          .filter((row) => row.status !== 'draft')
          .map((row) => ({ ...row, assignment }));
      }),
    )
      .then((values) => {
        if (active)
          setRows(
            values
              .flat()
              .sort((a, b) => (b.submitted_at ?? '').localeCompare(a.submitted_at ?? '')),
          );
      })
      .catch((reason) => {
        if (active) setError(reason);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [assignments.data, version]);
  const items = assignments.data?.items ?? [];
  const completed = items.filter((a) => a.status === 'completed').length;
  const overdue = items.filter((a) => a.status === 'overdue').length;
  const graded = rows.filter((row) => row.status === 'reviewed' && row.points !== null);
  const maxPoints = graded.reduce((sum, row) => sum + row.max_points, 0);
  const average = maxPoints
    ? Math.round((graded.reduce((sum, row) => sum + (row.points ?? 0), 0) / maxPoints) * 100)
    : null;
  const pending = rows.filter((row) => row.status === 'pending_review').length;
  const date = (value: string | null) =>
    value
      ? new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z').toLocaleDateString(
          locale === 'en' ? 'en-GB' : 'ru-RU',
          { day: 'numeric', month: 'short' },
        )
      : '—';
  return (
    <Shell
      title={t('Результаты')}
      description={t('Оценки за тесты и задания, ваши достижения в обучении')}
    >
      {!!assignments.error && (
        <RequestError error={assignments.error} onRetry={() => void assignments.reload()} />
      )}
      {!!error && <RequestError error={error} onRetry={() => setVersion((value) => value + 1)} />}
      <div className={s.stats}>
        {[
          [
            t('Курсов завершено'),
            assignments.data ? t('{v0} из {v1}', { v0: completed, v1: items.length }) : '—',
            t('Назначенное обучение'),
          ],
          [t('Средний балл'), average === null ? '—' : `${average}%`, t('По проверенным ответам')],
          [
            t('Ждут проверки'),
            loading || assignments.loading || error || assignments.error ? '—' : String(pending),
            t('Ответы проверит наставник'),
          ],
          [t('Просрочено'), assignments.data ? String(overdue) : '—', t('Курсы с истёкшим сроком')],
        ].map(([label, value, caption], index) => (
          <section key={label} className={s.stat} data-warning={index === 3 && overdue > 0}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{caption}</small>
          </section>
        ))}
      </div>
      <section className={s.panel}>
        <h2>{t('Тесты и задания')}</h2>
        {(loading || assignments.loading) && (
          <LoadingState>{t('Загружаем результаты…')}</LoadingState>
        )}
        {!loading && !error && !assignments.loading && !assignments.error && !rows.length && (
          <div className={styles.empty}>
            <h3>{t('Результаты появятся после первого задания')}</h3>
            <Link to='/learning' className={styles.primary}>
              {t('Перейти к обучению')}
            </Link>
          </div>
        )}
        {!!rows.length && (
          <table className={s.table}>
            <thead>
              <tr>
                {['Курс и элемент', 'Дата', 'Попытка', 'Результат', 'Статус', ''].map(
                  (text, index) => (
                    <th key={index}>{t(text)}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const score =
                  row.points !== null && row.max_points
                    ? Math.round((row.points / row.max_points) * 100)
                    : null;
                const waiting = row.status === 'pending_review';
                const passed = score !== null && score >= row.assignment.rules.pass_percent;
                const canRetry =
                  row.assignment.state === 'active' && row.can_retry && !passed && !waiting;
                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.assignment.title}</strong>
                      <small>{t('Проверка знаний')}</small>
                    </td>
                    <td data-label={t('Дата')}>{date(row.submitted_at)}</td>
                    <td data-label={t('Попытка')}>
                      {row.attempt} {t('из')} {row.assignment.rules.max_attempts}
                    </td>
                    <td data-label={t('Результат')}>{score === null ? '—' : `${score}%`}</td>
                    <td data-label={t('Статус')}>
                      <span
                        className={s.badge}
                        data-tone={waiting ? 'pending' : passed ? 'passed' : 'failed'}
                      >
                        {t(waiting ? 'На проверке' : passed ? 'Сдан' : 'Не сдан')}
                      </span>
                    </td>
                    <td>
                      <Link
                        className={canRetry ? styles.primary : styles.secondary}
                        to={`/learning/${row.assignment.id}?${row.assignment.state === 'active' ? `item=${encodeURIComponent(row.assessment_id)}` : 'view=results'}`}
                      >
                        {t(canRetry ? 'Пройти снова' : 'Открыть')}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className={s.caption}>
          {t(
            'Ответы на открытые вопросы и практические задания проверяет наставник. Итог появится здесь.',
          )}
        </p>
      </section>
      {(assignments.data?.total ?? 0) > 24 && (
        <div className={styles.row}>
          <span>{t('Показаны результаты курсов на текущей странице')}</span>
          <button
            className={styles.secondary}
            disabled={!page || loading}
            onClick={() => setPage((value) => value - 1)}
          >
            {t('Назад')}
          </button>
          <button
            className={styles.secondary}
            disabled={(page + 1) * 24 >= (assignments.data?.total ?? 0) || loading}
            onClick={() => setPage((value) => value + 1)}
          >
            {t('Далее')}
          </button>
        </div>
      )}
    </Shell>
  );
}
