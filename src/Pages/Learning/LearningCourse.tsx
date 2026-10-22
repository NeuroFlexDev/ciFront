import { useLocale } from '@/i18n/useLocale';
import { useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '@/auth/auth-context';
import { isBusiness } from '@/shared/business';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/shared/api';
import { Shell } from '@/Pages/Workspace/shared';
import { LoadingState, RequestError } from '@/Components/RequestState';
import MarkdownContent from '@/Components/MarkdownContent';
import { LearnerSources } from '@/Components/SourceReleasePanel';
import { useLearningData } from './useLearningData';
import AssessmentAnswer from './AssessmentAnswer';
import LearningAssistant from './LearningAssistant';
import type { Assignment, AssignmentDetail, LearnerResponse } from './types';
import { dateLabel, stateLabel } from './types';
import s from './learning.module.css';

export default function LearningCourse() {
  const { t } = useLocale();
  const business = isBusiness(useContext(AuthContext)?.user);

  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const resultsOnly = params.get('view') === 'results';
  const query = useLearningData<AssignmentDetail>(
    id ? `/learning/assignments/${id}${resultsOnly ? '/results' : ''}` : null,
  );
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [assistant, setAssistant] = useState(false);
  const requestedBookmarks = useRef(new Set<string>());
  const writing = useRef(false);
  const reader = useRef<HTMLDivElement>(null);
  const focusNextItem = useRef(false);
  const data = query.data;
  const lessons =
    data?.content?.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, module: m }))) ?? [];
  const assessments = data?.content
    ? [...data.content.modules.flatMap((m) => m.assessments), ...data.content.assessments]
    : [];
  const key =
    params.get('item') ??
    data?.last_item_key ??
    (data?.last_lesson_id
      ? `lesson:${data.last_lesson_id}`
      : lessons[0]
        ? `lesson:${lessons[0].id}`
        : assessments[0]?.id);
  const lesson = lessons.find((l) => `lesson:${l.id}` === key);
  const assessment = assessments.find((a) => a.id === key);
  useEffect(() => {
    if (!focusNextItem.current) return;
    focusNextItem.current = false;
    const heading = reader.current?.querySelector<HTMLElement>('h2');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
    reader.current?.scrollIntoView?.({
      block: 'start',
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }, [key]);
  const directItem = params.get('item');
  const validDirectItem = Boolean(lesson || assessment);
  const { reload } = query;
  const assignmentId = data?.id;
  const revision = data?.progress_revision;
  const savedItem = data?.last_item_key;
  const active = data?.state === 'active';
  useEffect(() => {
    if (
      !directItem ||
      !validDirectItem ||
      !assignmentId ||
      revision === undefined ||
      !active ||
      resultsOnly ||
      busy ||
      writing.current
    )
      return;
    const marker = `${assignmentId}:${directItem}`;
    if (savedItem === directItem || requestedBookmarks.current.has(marker)) return;
    // A deep link is an explicit navigation. Try once; a conflict must never
    // silently retry an old location using another device's newer revision.
    requestedBookmarks.current.add(marker);
    writing.current = true;
    setBusy(true);
    void api
      .put(`/learning/assignments/${assignmentId}/bookmark`, {
        expected_revision: revision,
        item_key: directItem,
      })
      .then(() => reload())
      .catch(setError)
      .finally(() => {
        writing.current = false;
        setBusy(false);
      });
  }, [
    directItem,
    validDirectItem,
    assignmentId,
    revision,
    active,
    savedItem,
    resultsOnly,
    busy,
    reload,
  ]);
  const choose = async (item: string) => {
    if (busy || writing.current) return;
    focusNextItem.current = item !== key;
    setParams({ item });
    setError(null);
    const valid =
      lessons.some((value) => `lesson:${value.id}` === item) ||
      assessments.some((value) => value.id === item);
    if (!data || !valid) return;
    requestedBookmarks.current.add(`${data.id}:${item}`);
    writing.current = true;
    setBusy(true);
    try {
      await api.put<Assignment>(`/learning/assignments/${id}/bookmark`, {
        expected_revision: data.progress_revision,
        item_key: item,
      });
      await query.reload();
    } catch (reason) {
      setError(reason);
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };
  const markComplete = async () => {
    if (!data || !lesson || writing.current) return;
    writing.current = true;
    setBusy(true);
    setError(null);
    try {
      const saved = await api.put<Assignment>(`/learning/assignments/${id}/progress`, {
        expected_revision: data.progress_revision,
        lesson_id: lesson.id,
        completed: true,
      });
      const index = lessons.findIndex((l) => l.id === lesson.id);
      const next = lessons[index + 1];
      const nextItem = next ? `lesson:${next.id}` : assessments[0]?.id;
      if (nextItem) {
        requestedBookmarks.current.add(`${data.id}:${nextItem}`);
        await api.put<Assignment>(`/learning/assignments/${id}/bookmark`, {
          expected_revision: saved.data.progress_revision,
          item_key: nextItem,
        });
        focusNextItem.current = nextItem !== key;
        setParams({ item: nextItem });
      }
      await query.reload();
    } catch (e) {
      setError(e);
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };
  return (
    <Shell
      title={data?.title ?? t('Обучение')}
      description={
        data
          ? t('Опубликованная версия {v0} · срок: {v1}', {
              v0: data.revision,
              v1: dateLabel(data.due_at),
            })
          : t('Открываем назначенный вам курс')
      }
      action={
        <Link className={s.secondary} to='/learning'>
          {t('← Моё обучение')}
        </Link>
      }
    >
      <div className={s.page}>
        {!!query.error && (
          <RequestError error={query.error} onRetry={() => void query.reload()} fullPage={!data} />
        )}{' '}
        {!data && query.loading && (
          <LoadingState>{t('Загружаем курс и сохранённые ответы…')}</LoadingState>
        )}
        {data && (
          <>
            <div className={s.stats}>
              <div className={s.stat}>
                <span>{t('Пройдено уроков')}</span>
                <strong>
                  {data.completed_lessons.length} / {data.lesson_count}
                </strong>
              </div>
              <div className={s.stat}>
                <span>{t('Баллы')}</span>
                <strong>
                  {data.max_points ? `${data.points} / ${data.max_points}` : t('Без оценки')}
                </strong>
              </div>
              <div className={s.stat}>
                <span>{t('Статус обучения')}</span>
                <strong style={{ fontSize: 23 }}>
                  {t(stateLabel[data.status] ?? String(data.status)) ?? data.status}
                </strong>
              </div>
            </div>
            {!resultsOnly && data.content && (
              <LearnerSources assignmentId={data.id} sources={data.content.sources ?? []} />
            )}
            <div className={s.tablist}>
              <button
                aria-selected={!resultsOnly}
                disabled={data.state !== 'active'}
                onClick={() => setParams({})}
              >
                {t('Материалы и задания')}
              </button>
              <button aria-selected={resultsOnly} onClick={() => setParams({ view: 'results' })}>
                {t('Мои результаты')}
              </button>
            </div>
            {resultsOnly ? (
              <Results data={data} responses={data.responses} />
            ) : (
              <div className={s.layout}>
                <div className={s.stack} ref={reader} style={{ scrollMarginTop: 24 }}>
                  {lesson ? (
                    <>
                      <article className={s.article}>
                        {!business && <p className={s.accent}>{lesson.module.title}</p>}
                        <h2>{lesson.title}</h2>
                        <MarkdownContent>{lesson.content}</MarkdownContent>
                        <hr className={s.divider} />
                        <div className={s.spread}>
                          <span className={s.muted}>
                            {data.completed_lessons.includes(lesson.id)
                              ? t('Урок отмечен как пройденный')
                              : t('Отметьте урок после изучения материала')}
                          </span>
                          <button
                            className={s.primary}
                            disabled={busy}
                            onClick={() => void markComplete()}
                          >
                            {busy ? t('Сохраняем…') : t('Урок пройден · продолжить →')}
                          </button>
                        </div>
                      </article>
                      {
                        <>
                          <button
                            className={s.secondary}
                            aria-expanded={assistant}
                            onClick={() => setAssistant((v) => !v)}
                          >
                            {assistant
                              ? t('Свернуть помощника')
                              : data.rules.allow_ai_assistant
                                ? t('✧ Задать вопрос по уроку')
                                : t('История помощника')}
                          </button>
                          {assistant && (
                            <LearningAssistant
                              key={lesson.id}
                              assignmentId={data.id}
                              lessonId={lesson.id}
                              onLesson={(lessonId) => {
                                void choose(`lesson:${lessonId}`);
                              }}
                            />
                          )}
                        </>
                      }
                    </>
                  ) : assessment ? (
                    <AssessmentAnswer
                      key={assessment.id}
                      assignmentId={data.id}
                      assessment={assessment}
                      responses={data.responses}
                      onSaved={query.reload}
                    />
                  ) : (
                    <section className={s.empty}>
                      <h2>{t('Выберите материал курса')}</h2>
                      <p>{t('Уроки и задания доступны в списке справа.')}</p>
                    </section>
                  )}
                  {!!error && <RequestError error={error} onRetry={() => void query.reload()} />}
                </div>
                <nav className={s.rail} aria-label={t('Уроки и задания курса')}>
                  {data.content.modules.map((m, i) => (
                    <div className={s.stack} style={{ gap: 10 }} key={m.id}>
                      {!business && <div className={s.railSection}>
                        {t('Модуль') + ' '}
                        {i + 1} · {m.title}
                      </div>}
                      {m.lessons.map((l, n) => (
                        <button
                          key={l.id}
                          className={s.railItem}
                          aria-current={key === `lesson:${l.id}`}
                          data-complete={data.completed_lessons.includes(l.id)}
                          disabled={busy}
                          onClick={() => void choose(`lesson:${l.id}`)}
                        >
                          <strong>{n + 1}</strong>
                          <span>
                            {l.title}
                            {data.completed_lessons.includes(l.id) && <small>{t('Пройден')}</small>}
                          </span>
                        </button>
                      ))}
                      {m.assessments.map((a, n) => (
                        <button
                          key={a.id}
                          className={s.railItem}
                          aria-current={key === a.id}
                          disabled={busy}
                          onClick={() => void choose(a.id)}
                        >
                          <strong>✓</strong>
                          <span>
                            {a.question_type === 'open' ? t('Практика') : t('Тест')} {n + 1}.{' '}
                            {a.question}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                  {data.content.assessments.map((a) => (
                    <button
                      key={a.id}
                      className={s.railItem}
                      aria-current={key === a.id}
                      disabled={busy}
                      onClick={() => void choose(a.id)}
                    >
                      <strong>✓</strong>
                      <span>
                        {t('Итоговое задание ·') + ' '}
                        {a.question}
                      </span>
                    </button>
                  ))}
                  <div className={s.card}>
                    <h3>{t('Правила прохождения')}</h3>
                    <p className={s.muted}>
                      {t('До') + ' '}
                      {data.rules.max_attempts}
                      {' ' + t('попыток на задание. Проходной балл —') + ' '}
                      {data.rules.pass_percent}%.{' '}
                      {data.rules.require_all_lessons ? t('Нужно изучить все уроки.') : ''}{' '}
                      {data.rules.require_all_assessments ? t('Нужно пройти все задания.') : ''}
                    </p>
                    <p className={s.caption}>
                      {t('Версия правил') + ' '}
                      {data.rules_revision}
                      {' ' + t('закреплена за этим назначением.')}
                    </p>
                  </div>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}

function Results({ data, responses }: { data: Assignment; responses: LearnerResponse[] }) {
  const { t } = useLocale();

  return (
    <div className={s.stack}>
      <section className={s.card}>
        <h2>{t('Результаты прохождения')}</h2>
        <p>
          {data.completed_at
            ? t('Курс завершён {v0}.', { v0: dateLabel(data.completed_at) })
            : t('Обучение ещё не завершено.')}{' '}
          {data.pending_reviews > 0
            ? t('Работ ожидает проверки: {v0}.', { v0: data.pending_reviews })
            : ''}
        </p>
        <p className={s.muted}>
          {t(
            'Каждая попытка и комментарий сохранены. Предыдущая оценка не исчезает при пересдаче.',
          )}
        </p>
      </section>
      {!responses.length && (
        <section className={s.empty}>
          <h3>{t('Ответов пока нет')}</h3>
          <p>{t('После сохранения или отправки задания результат появится здесь.')}</p>
        </section>
      )}
      {responses.map((r) => (
        <article className={s.card} key={r.id}>
          <div className={s.spread}>
            <h3>
              {r.assessment_id.startsWith('task:') ? t('Практическое задание') : t('Тест')}{' '}
              {t('· попытка') + ' '}
              {r.attempt}
            </h3>
            <span className={s.badge}>{t(stateLabel[r.status] ?? String(r.status))}</span>
          </div>
          <p>
            {r.points === null
              ? t('Баллы ещё не выставлены')
              : t('{v0} из {v1} баллов', { v0: r.points, v1: r.max_points })}
          </p>
          {r.feedback && <p>{r.feedback}</p>}
          <details>
            <summary>{t('Ваш ответ')}</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {r.answer.text ?? r.answer.selected?.join('\n')}
            </pre>
          </details>
          {r.correct_answers && (
            <p className={s.notice}>
              {t('Правильные ответы:') + ' '}
              {r.correct_answers.join(' · ')}
            </p>
          )}
          {r.can_retry && data.state === 'active' && (
            <Link
              className={s.primary}
              to={`/learning/${data.id}?item=${encodeURIComponent(r.assessment_id)}`}
            >
              {t('Открыть задание для пересдачи')}
            </Link>
          )}
        </article>
      ))}
    </div>
  );
}
