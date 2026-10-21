import { useState } from "react";
import { Link } from "react-router-dom";
import { Shell } from "@/Pages/Workspace/shared";
import { LoadingState, RequestError } from "@/Components/RequestState";
import { useLearningData } from "./useLearningData";
import {
  type Assignment,
  type ProgramEnrollment,
  dateLabel,
  stateLabel,
} from "./types";
import s from "./learning.module.css";

export default function LearningHome() {
  const [history, setHistory] = useState(false);
  const [page, setPage] = useState(0);
  const courses = useLearningData<{ items: Assignment[]; total: number }>(
    `/learning/assignments?include_history=${history}&offset=${page * 24}&limit=24`,
  );
  const programs = useLearningData<{ items: ProgramEnrollment[] }>(
    "/learning/programs",
  );
  return (
    <Shell
      title="Моё обучение"
      description="Назначенные курсы, ваши ответы и результаты. Прогресс сохранён в аккаунте."
    >
      <div className={s.page}>
        <div className={s.spread}>
          <label className={s.check}>
            <input
              type="checkbox"
              checked={history}
              onChange={(e) => {
                setHistory(e.target.checked);
                setPage(0);
              }}
            />
            Показывать историю назначений
          </label>
          <button
            className={s.secondary}
            disabled={courses.loading}
            onClick={() => void courses.reload()}
          >
            Обновить
          </button>
        </div>
        {!!courses.error && (
          <RequestError
            error={courses.error}
            onRetry={() => void courses.reload()}
          />
        )}
        {!courses.data && courses.loading && (
          <LoadingState>Загружаем ваше обучение…</LoadingState>
        )}
        {programs.data?.items.length ? (
          <section className={s.stack} style={{ margin: "28px 0" }}>
            <h2>Программы обучения</h2>
            {programs.data.items.map((p) => (
              <article key={p.id} className={s.card}>
                <div className={s.spread}>
                  <div>
                    <h3>{p.title}</h3>
                    <p className={s.muted}>
                      {
                        p.assignments.filter((a) => a.status === "completed")
                          .length
                      }{" "}
                      из {p.assignments.length} этапов · версия программы{" "}
                      {p.program_revision}
                    </p>
                  </div>
                  {p.next_assignment_id ? (
                    <Link
                      className={s.primary}
                      to={`/learning/${p.next_assignment_id}`}
                    >
                      Продолжить программу →
                    </Link>
                  ) : (
                    <span className={s.badge}>
                      {stateLabel[p.status] ?? p.status}
                    </span>
                  )}
                </div>
                <div className={s.row}>
                  {p.assignments.map((a, i) => (
                    <span key={a.id} className={s.badge}>
                      {i + 1}. {a.title} · {stateLabel[a.status] ?? a.status}
                    </span>
                  ))}
                </div>
                {p.next_cycle_at && (
                  <p className={s.caption}>
                    Следующее повторное обучение: {dateLabel(p.next_cycle_at)}
                  </p>
                )}
              </article>
            ))}
          </section>
        ) : null}
        {!!programs.error && (
          <RequestError
            error={programs.error}
            onRetry={() => void programs.reload()}
          />
        )}
        {courses.data && !courses.data.items.length && (
          <section className={s.empty}>
            <h2>
              {history
                ? "В истории пока нет курсов"
                : "Пока нет назначенных курсов"}
            </h2>
            <p>
              Ответственный за обучение назначит вам курс или программу. После
              назначения они появятся здесь.
            </p>
            <Link className={s.secondary} to="/employees">
              Открыть команду
            </Link>
          </section>
        )}
        <div className={s.grid} style={{ marginTop: 28 }}>
          {courses.data?.items.map((a) => (
            <article className={s.card} key={a.id}>
              <span className={s.badge}>
                {stateLabel[a.status] ?? a.status}
              </span>
              <h2 style={{ marginTop: 20 }}>{a.title}</h2>
              <p className={s.muted}>
                Версия {a.revision} · {a.lesson_count} уроков
              </p>
              <progress
                className={s.progress}
                value={a.progress_percent}
                max={100}
                aria-label={`Прогресс курса ${a.title}`}
              />
              <div className={s.spread}>
                <span>{a.progress_percent}% пройдено</span>
                {a.max_points > 0 && (
                  <span>
                    {a.points} / {a.max_points} баллов
                  </span>
                )}
              </div>
              <p className={s.muted}>Срок: {dateLabel(a.due_at)}</p>
              {a.status === "locked" ? (
                <p className={s.notice}>
                  Этот этап откроется после завершения предыдущего курса
                  программы.
                </p>
              ) : (
                <Link
                  className={s.primary}
                  to={`/learning/${a.id}${a.state !== "active" ? "?view=results" : ""}`}
                >
                  {a.state !== "active"
                    ? "Посмотреть результаты"
                    : a.status === "completed"
                      ? "Открыть пройденный курс"
                      : a.status === "assigned"
                        ? "Начать обучение"
                        : "Продолжить"}{" "}
                  →
                </Link>
              )}
            </article>
          ))}
        </div>
        {!!courses.data && courses.data.total > 24 && (
          <nav className={s.stickyActions} aria-label="Страницы назначений">
            <button
              className={s.secondary}
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Назад
            </button>
            <span>
              Страница {page + 1} из {Math.ceil(courses.data.total / 24)}
            </span>
            <button
              className={s.secondary}
              disabled={(page + 1) * 24 >= courses.data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Далее
            </button>
          </nav>
        )}
      </div>
    </Shell>
  );
}
