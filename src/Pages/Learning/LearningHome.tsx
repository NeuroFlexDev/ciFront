import { useLocale } from '@/i18n/useLocale';
import { pluralForm } from '@/i18n/plurals';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock3, FileCheck2 } from 'lucide-react';
import { Shell } from '@/Pages/Workspace/shared';
import { LoadingState, RequestError } from '@/Components/RequestState';
import { useLearningData } from './useLearningData';
import { type Assignment, type ProgramEnrollment, dateLabel, stateLabel } from './types';
import s from './learning.module.css';

export default function LearningHome() {
  const { t, locale } = useLocale();

  const [filter, setFilter] = useState('all');
  const [history, setHistory] = useState(false);
  const [page, setPage] = useState(0);
  const courses = useLearningData<{ items: Assignment[]; total: number }>(
    `/learning/assignments?include_history=${history}&offset=${page * 24}&limit=24`,
  );
  const programs = useLearningData<{ items: ProgramEnrollment[] }>('/learning/programs');
  const matches = (a: Assignment, key: string) =>
    key === 'all' ||
    (key === 'completed'
      ? a.status === 'completed'
      : key === 'overdue'
        ? a.status === 'overdue'
        : a.status === 'in_progress');
  const assignments = courses.data?.items ?? [];
  const due = assignments
    .filter((a) => a.state === 'active' && a.status !== 'completed' && a.due_at)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
    .slice(0, 3);
  const pending = assignments.filter((a) => a.pending_reviews > 0);
  return (
    <Shell
      title={t('Моё обучение')}
      description={t('Назначенные курсы, ваши ответы и результаты. Прогресс сохранён в аккаунте.')}
    >
      <div className={s.page}>
        <div className={`${s.spread} ${s.filterBar}`}>
          <label className={s.check}>
            <input
              type='checkbox'
              checked={history}
              onChange={(e) => {
                setHistory(e.target.checked);
                setPage(0);
              }}
            />
            {t('Показывать историю назначений')}
          </label>
          <button
            className={s.secondary}
            disabled={courses.loading}
            onClick={() => void courses.reload()}
          >
            {t('Обновить')}
          </button>
        </div>
        {!!courses.error && (
          <RequestError error={courses.error} onRetry={() => void courses.reload()} />
        )}
        {!courses.data && courses.loading && (
          <LoadingState>{t('Загружаем ваше обучение…')}</LoadingState>
        )}
        {programs.data?.items.length ? (
          <section className={s.stack} style={{ margin: '28px 0' }}>
            <h2>{t('Программы обучения')}</h2>
            {programs.data.items.map((p) => (
              <article key={p.id} className={s.card}>
                <div className={s.spread}>
                  <div>
                    <h3>{p.title}</h3>
                    <p className={s.muted}>
                      {p.assignments.filter((a) => a.status === 'completed').length} {t('из') + ' '}
                      {p.assignments.length}
                      {' ' + t('этапов · версия программы')} {p.program_revision}
                    </p>
                  </div>
                  {p.next_assignment_id ? (
                    <Link className={s.primary} to={`/learning/${p.next_assignment_id}`}>
                      {t('Продолжить программу →')}
                    </Link>
                  ) : (
                    <span className={s.badge}>
                      {t(stateLabel[p.status] ?? String(p.status)) ?? p.status}
                    </span>
                  )}
                </div>
                <div className={s.row}>
                  {p.assignments.map((a, i) => (
                    <span key={a.id} className={s.badge}>
                      {i + 1}. {a.title} · {t(stateLabel[a.status] ?? String(a.status)) ?? a.status}
                    </span>
                  ))}
                </div>
                {p.next_cycle_at && (
                  <p className={s.caption}>
                    {t('Следующее повторное обучение:') + ' '}
                    {dateLabel(p.next_cycle_at)}
                  </p>
                )}
              </article>
            ))}
          </section>
        ) : null}
        {!!programs.error && (
          <RequestError error={programs.error} onRetry={() => void programs.reload()} />
        )}
        {courses.data && !courses.data.items.length && (
          <section className={s.empty}>
            <h2>{history ? t('В истории пока нет курсов') : t('Пока нет назначенных курсов')}</h2>
            <p>
              {t(
                'Ответственный за обучение назначит вам курс или программу. После назначения они появятся здесь.',
              )}
            </p>
            <Link className={s.secondary} to='/employees'>
              {t('Открыть команду')}
            </Link>
          </section>
        )}
        {!!assignments.length && (
          <nav className={s.learningFilters} aria-label={t('Фильтры обучения')}>
            {[
              ['all', 'Все'],
              ['in_progress', 'В процессе'],
              ['overdue', 'Просроченные'],
              ['completed', 'Завершённые'],
            ].map(([key, label]) => (
              <button
                key={key}
                type='button'
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {t(label)} · {assignments.filter((a) => matches(a, key)).length}
              </button>
            ))}
            {(courses.data?.total ?? 0) > 24 && <small>{t('На текущей странице')}</small>}
          </nav>
        )}
        <div className={s.learningOverview}>
          <div className={`${s.grid} ${s.learningCards}`}>
            {assignments
              .filter((a) => matches(a, filter))
              .map((a) => (
                <article className={`${s.card} ${s.courseCard}`} key={a.id} data-status={a.status}>
                  <div className={s.courseCover} aria-hidden='true' />
                  <span className={s.badge}>
                    {t(stateLabel[a.status] ?? String(a.status)) ?? a.status}
                  </span>
                  <h2>{a.title}</h2>
                  <p className={`${s.muted} ${s.courseMeta}`}>
                    <BookOpen size={17} strokeWidth={1.5} aria-hidden='true' />
                    {t('Версия') + ' '}
                    {a.revision} · {a.lesson_count}
                    {' ' + t(pluralForm(locale, a.lesson_count, 'урок', 'урока', 'уроков'))}
                  </p>
                  <div className={s.courseProgress}>
                    <progress
                      className={s.progress}
                      value={a.progress_percent}
                      max={100}
                      aria-label={t('Прогресс курса {v0}', { v0: a.title })}
                    />
                    <div className={s.spread}>
                      <span>
                        {a.progress_percent}
                        {t('% пройдено')}
                      </span>
                      {a.max_points > 0 && (
                        <span>
                          {a.points} / {a.max_points}
                          {' ' + t('баллов')}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={s.muted}>
                    {t('Срок:') + ' '}
                    {dateLabel(a.due_at)}
                  </p>
                  {a.status === 'locked' ? (
                    <p className={s.notice}>
                      {t('Этот этап откроется после завершения предыдущего курса программы.')}
                    </p>
                  ) : (
                    <Link
                      className={s.primary}
                      to={`/learning/${a.id}${a.state !== 'active' ? '?view=results' : ''}`}
                    >
                      {a.state !== 'active'
                        ? t('Посмотреть результаты')
                        : a.status === 'completed'
                          ? t('Открыть пройденный курс')
                          : a.status === 'assigned'
                            ? t('Начать обучение')
                            : t('Продолжить')}{' '}
                      →
                    </Link>
                  )}
                </article>
              ))}
          </div>
          {assignments.length > 0 && (
            <aside className={s.learningAside}>
              <section className={s.card}>
                <h2>{t('Ближайшие сроки')}</h2>
                {due.length ? (
                  due.map((a) => (
                    <Link
                      key={a.id}
                      to={`/learning/${a.id}`}
                      className={s.deadlineItem}
                      data-overdue={a.status === 'overdue'}
                    >
                      <span className={s.deadlineDate}>
                        <strong>{new Date(a.due_at!).getDate()}</strong>
                        <small>
                          {new Date(a.due_at!).toLocaleDateString(
                            locale === 'en' ? 'en-GB' : 'ru-RU',
                            { month: 'short' },
                          )}
                        </small>
                      </span>
                      <span>
                        {a.title}
                        <small>
                          {t(a.status === 'overdue' ? 'Срок прохождения истёк' : 'До срока')}:{' '}
                          {dateLabel(a.due_at)}
                        </small>
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className={s.muted}>
                    <Clock3 size={18} aria-hidden='true' />{' '}
                    {t('Нет незавершённых курсов с назначенным сроком.')}
                  </p>
                )}
              </section>
              <section className={s.card}>
                <h2>{t('Ждут проверки')}</h2>
                {pending.length ? (
                  pending.map((a) => (
                    <Link
                      key={a.id}
                      to={`/learning/${a.id}?view=results`}
                      className={s.deadlineItem}
                    >
                      <span className={s.deadlineDate}>
                        <FileCheck2 size={24} aria-hidden='true' />
                      </span>
                      <span>
                        {a.title}
                        <small>{t('На проверке: {v0}', { v0: a.pending_reviews })}</small>
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className={s.muted}>
                    {t(
                      'Все отправленные ответы проверены. Результаты доступны в карточках курсов.',
                    )}
                  </p>
                )}
              </section>
            </aside>
          )}
        </div>
        {!!assignments.length && !assignments.some((a) => matches(a, filter)) && (
          <section className={s.empty}>
            <h2>{t('Курсов с таким статусом пока нет')}</h2>
            <button className={s.secondary} onClick={() => setFilter('all')}>
              {t('Показать все курсы')}
            </button>
          </section>
        )}
        {!!courses.data && courses.data.total > 24 && (
          <nav className={s.stickyActions} aria-label={t('Страницы назначений')}>
            <button
              className={s.secondary}
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              {t('Назад')}
            </button>
            <span>
              {t('Страница') + ' '}
              {page + 1}
              {' ' + t('из') + ' '}
              {Math.ceil(courses.data.total / 24)}
            </span>
            <button
              className={s.secondary}
              disabled={(page + 1) * 24 >= courses.data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('Далее')}
            </button>
          </nav>
        )}
      </div>
    </Shell>
  );
}
