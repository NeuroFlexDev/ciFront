import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "@/shared/api";
import { Shell } from "@/Pages/Workspace/shared";
import { LoadingState, RequestError } from "@/Components/RequestState";
import MarkdownContent from "@/Components/MarkdownContent";
import { useLearningData } from "./useLearningData";
import AssessmentAnswer from "./AssessmentAnswer";
import LearningAssistant from "./LearningAssistant";
import type { Assignment, AssignmentDetail, LearnerResponse } from "./types";
import { dateLabel, stateLabel } from "./types";
import s from "./learning.module.css";

export default function LearningCourse() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const resultsOnly = params.get("view") === "results";
  const query = useLearningData<AssignmentDetail>(
    id ? `/learning/assignments/${id}${resultsOnly ? "/results" : ""}` : null,
  );
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [assistant, setAssistant] = useState(false);
  const data = query.data;
  const lessons =
    data?.content?.modules.flatMap((m) =>
      m.lessons.map((l) => ({ ...l, module: m })),
    ) ?? [];
  const assessments = data?.content
    ? [
        ...data.content.modules.flatMap((m) => m.assessments),
        ...data.content.assessments,
      ]
    : [];
  const key =
    params.get("item") ??
    (data?.last_lesson_id
      ? `lesson:${data.last_lesson_id}`
      : lessons[0]
        ? `lesson:${lessons[0].id}`
        : assessments[0]?.id);
  const lesson = lessons.find((l) => `lesson:${l.id}` === key);
  const assessment = assessments.find((a) => a.id === key);
  const choose = (item: string) => {
    setParams({ item });
    setError(null);
  };
  const markComplete = async () => {
    if (!data || !lesson) return;
    setBusy(true);
    setError(null);
    try {
      await api.put<Assignment>(`/learning/assignments/${id}/progress`, {
        expected_revision: data.progress_revision,
        lesson_id: lesson.id,
        completed: true,
      });
      await query.reload();
      const index = lessons.findIndex((l) => l.id === lesson.id);
      const next = lessons[index + 1];
      if (next) choose(`lesson:${next.id}`);
      else if (assessments[0]) choose(assessments[0].id);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell
      title={data?.title ?? "Обучение"}
      description={
        data
          ? `Опубликованная версия ${data.revision} · срок: ${dateLabel(data.due_at)}`
          : "Открываем назначенный вам курс"
      }
      action={
        <Link className={s.secondary} to="/learning">
          ← Моё обучение
        </Link>
      }
    >
      <div className={s.page}>
        {!!query.error && (
          <RequestError
            error={query.error}
            onRetry={() => void query.reload()}
            fullPage={!data}
          />
        )}{" "}
        {!data && query.loading && (
          <LoadingState>Загружаем курс и сохранённые ответы…</LoadingState>
        )}
        {data && (
          <>
            <div className={s.stats}>
              <div className={s.stat}>
                <span>Пройдено уроков</span>
                <strong>
                  {data.completed_lessons.length} / {data.lesson_count}
                </strong>
              </div>
              <div className={s.stat}>
                <span>Баллы</span>
                <strong>
                  {data.max_points
                    ? `${data.points} / ${data.max_points}`
                    : "Без оценки"}
                </strong>
              </div>
              <div className={s.stat}>
                <span>Статус обучения</span>
                <strong style={{ fontSize: 23 }}>
                  {stateLabel[data.status] ?? data.status}
                </strong>
              </div>
            </div>
            <div className={s.tablist}>
              <button
                aria-selected={!resultsOnly}
                disabled={data.state !== "active"}
                onClick={() => setParams({})}
              >
                Материалы и задания
              </button>
              <button
                aria-selected={resultsOnly}
                onClick={() => setParams({ view: "results" })}
              >
                Мои результаты
              </button>
            </div>
            {resultsOnly ? (
              <Results data={data} responses={data.responses} />
            ) : (
              <div className={s.layout}>
                <div className={s.stack}>
                  {lesson ? (
                    <>
                      <article className={s.article}>
                        <p className={s.accent}>{lesson.module.title}</p>
                        <h2>{lesson.title}</h2>
                        <MarkdownContent>{lesson.content}</MarkdownContent>
                        <hr className={s.divider} />
                        <div className={s.spread}>
                          <span className={s.muted}>
                            {data.completed_lessons.includes(lesson.id)
                              ? "Урок отмечен как пройденный"
                              : "Отметьте урок после изучения материала"}
                          </span>
                          <button
                            className={s.primary}
                            disabled={busy}
                            onClick={() => void markComplete()}
                          >
                            {busy
                              ? "Сохраняем…"
                              : "Урок пройден · продолжить →"}
                          </button>
                        </div>
                      </article>
                      {data.rules.allow_ai_assistant && (
                        <>
                          <button
                            className={s.secondary}
                            aria-expanded={assistant}
                            onClick={() => setAssistant((v) => !v)}
                          >
                            {assistant
                              ? "Свернуть помощника"
                              : "✧ Задать вопрос по уроку"}
                          </button>
                          {assistant && (
                            <LearningAssistant
                              key={lesson.id}
                              assignmentId={data.id}
                              lessonId={lesson.id}
                              onLesson={(lessonId) =>
                                choose(`lesson:${lessonId}`)
                              }
                            />
                          )}
                        </>
                      )}
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
                      <h2>Выберите материал курса</h2>
                      <p>Уроки и задания доступны в списке справа.</p>
                    </section>
                  )}
                  {!!error && (
                    <RequestError
                      error={error}
                      onRetry={() => void query.reload()}
                    />
                  )}
                </div>
                <nav className={s.rail} aria-label="Уроки и задания курса">
                  {data.content.modules.map((m, i) => (
                    <div className={s.stack} style={{ gap: 10 }} key={m.id}>
                      <div className={s.railSection}>
                        Модуль {i + 1} · {m.title}
                      </div>
                      {m.lessons.map((l, n) => (
                        <button
                          key={l.id}
                          className={s.railItem}
                          aria-current={key === `lesson:${l.id}`}
                          onClick={() => choose(`lesson:${l.id}`)}
                        >
                          <strong>{n + 1}</strong>
                          <span>
                            {l.title}
                            {data.completed_lessons.includes(l.id) && (
                              <small>Пройден</small>
                            )}
                          </span>
                        </button>
                      ))}
                      {m.assessments.map((a, n) => (
                        <button
                          key={a.id}
                          className={s.railItem}
                          aria-current={key === a.id}
                          onClick={() => choose(a.id)}
                        >
                          <strong>✓</strong>
                          <span>
                            {a.question_type === "open" ? "Практика" : "Тест"}{" "}
                            {n + 1}. {a.question}
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
                      onClick={() => choose(a.id)}
                    >
                      <strong>✓</strong>
                      <span>Итоговое задание · {a.question}</span>
                    </button>
                  ))}
                  <div className={s.card}>
                    <h3>Правила прохождения</h3>
                    <p className={s.muted}>
                      До {data.rules.max_attempts} попыток на задание. Проходной
                      балл — {data.rules.pass_percent}%.{" "}
                      {data.rules.require_all_lessons
                        ? "Нужно изучить все уроки."
                        : ""}{" "}
                      {data.rules.require_all_assessments
                        ? "Нужно пройти все задания."
                        : ""}
                    </p>
                    <p className={s.caption}>
                      Версия правил {data.rules_revision} закреплена за этим
                      назначением.
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

function Results({
  data,
  responses,
}: {
  data: Assignment;
  responses: LearnerResponse[];
}) {
  return (
    <div className={s.stack}>
      <section className={s.card}>
        <h2>Результаты прохождения</h2>
        <p>
          {data.completed_at
            ? `Курс завершён ${dateLabel(data.completed_at)}.`
            : "Обучение ещё не завершено."}{" "}
          {data.pending_reviews > 0
            ? `Работ ожидает проверки: ${data.pending_reviews}.`
            : ""}
        </p>
        <p className={s.muted}>
          Каждая попытка и комментарий сохранены. Предыдущая оценка не исчезает
          при пересдаче.
        </p>
      </section>
      {!responses.length && (
        <section className={s.empty}>
          <h3>Ответов пока нет</h3>
          <p>После сохранения или отправки задания результат появится здесь.</p>
        </section>
      )}
      {responses.map((r) => (
        <article className={s.card} key={r.id}>
          <div className={s.spread}>
            <h3>
              {r.assessment_id.startsWith("task:")
                ? "Практическое задание"
                : "Тест"}{" "}
              · попытка {r.attempt}
            </h3>
            <span className={s.badge}>{stateLabel[r.status]}</span>
          </div>
          <p>
            {r.points === null
              ? "Баллы ещё не выставлены"
              : `${r.points} из ${r.max_points} баллов`}
          </p>
          {r.feedback && <p>{r.feedback}</p>}
          <details>
            <summary>Ваш ответ</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {r.answer.text ?? r.answer.selected?.join("\n")}
            </pre>
          </details>
          {r.correct_answers && (
            <p className={s.notice}>
              Правильные ответы: {r.correct_answers.join(" · ")}
            </p>
          )}
          {r.can_retry && data.state === "active" && (
            <Link
              className={s.primary}
              to={`/learning/${data.id}?item=${encodeURIComponent(r.assessment_id)}`}
            >
              Открыть задание для пересдачи
            </Link>
          )}
        </article>
      ))}
    </div>
  );
}
