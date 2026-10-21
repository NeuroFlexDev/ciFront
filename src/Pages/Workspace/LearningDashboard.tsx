import { useState } from "react";
import { Link } from "react-router-dom";
import Menu from "@/Components/Menu/Menu";
import { LoadingState, RequestError } from "@/Components/RequestState";
import { useLocale } from "@/i18n/useLocale";
import { useLearningData } from "@/Pages/Learning/useLearningData";
import s from "./learningDashboard.module.css";

export type LearningDashboardData = {
  scope: "organization" | "authorized_team" | "self";
  period_days: number;
  activity_days: number;
  as_of: string;
  metrics: {
    assignments_in_period: number;
    completed_in_period: number;
    completion_percent: number | null;
    average_completion_hours: number | null;
    courses: number;
    people: number | null;
    active_assignments: number;
    completed_lessons: number;
    assigned_lessons: number;
    lesson_completion_percent: number | null;
    pending_review: number;
    submitted_attempts: number;
  };
  daily: { date: string; submitted_attempts: number }[];
};

export default function LearningDashboard() {
  const { locale, t } = useLocale();
  const [days, setDays] = useState(30),
    [activityDays, setActivityDays] = useState(7);
  const query = useLearningData<LearningDashboardData>(
    `/learning/dashboard?days=${days}&activity_days=${activityDays}`,
  );
  const permissions = useLearningData<{
    can_author: boolean;
    can_manage_team: boolean;
    can_review: boolean;
    can_report: boolean;
  }>("/team/permissions");
  const data = query.data,
    metrics = data?.metrics;
  const number = (value: number) =>
    value.toLocaleString(locale === "en" ? "en-GB" : "ru-RU", {
      maximumFractionDigits: 1,
    });
  const percent = (value: number | null) =>
    value === null ? "—" : `${number(value)}%`;
  const date = (value: string, weekday = false) =>
    new Date(`${value}T12:00:00Z`).toLocaleDateString(
      locale === "en" ? "en-GB" : "ru-RU",
      weekday
        ? { weekday: "short", timeZone: "UTC" }
        : { day: "numeric", month: "short", timeZone: "UTC" },
    );
  const maxActivity = Math.max(
    1,
    ...(data?.daily.map((day) => day.submitted_attempts) ?? []),
  );
  return (
    <>
      <Menu />
      <main className={s.page}>
        <h1 className={s.srOnly}>{t("Дашборд обучения")}</h1>
        {!!query.error && (
          <RequestError
            error={query.error}
            onRetry={() => void query.reload()}
          />
        )}
        {!data && !query.error && (
          <LoadingState>{t("Загружаем показатели обучения…")}</LoadingState>
        )}
        {data && metrics && (
          <>
            <div className={s.scope}>
              <span>
                {data.scope === "organization"
                  ? t("Пространство организации")
                  : data.scope === "authorized_team"
                    ? t("Доступные вам группы и команды")
                    : t("Ваше обучение")}
              </span>
              <button
                onClick={() => void query.reload()}
                disabled={query.loading}
              >
                {query.loading ? t("Обновляем…") : t("Обновить данные")}
              </button>
            </div>
            <div className={s.grid}>
              <section className={`${s.card} ${s.completion}`}>
                <header>
                  <h2>{t("Завершение")}</h2>
                  <label className={s.period}>
                    <span className={s.srOnly}>{t("Период назначений")}</span>
                    <select
                      value={days}
                      onChange={(event) => setDays(Number(event.target.value))}
                    >
                      {[7, 30, 90, 365].map((value) => (
                        <option key={value} value={value}>
                          {t("{v0} дней", { v0: value })}
                        </option>
                      ))}
                    </select>
                  </label>
                </header>
                <div
                  className={s.halfGauge}
                  role="img"
                  aria-label={t("Завершено {v0} из {v1} назначений", {
                    v0: metrics.completed_in_period,
                    v1: metrics.assignments_in_period,
                  })}
                >
                  <svg viewBox="0 0 400 220" aria-hidden="true">
                    <path
                      d="M 16 204 A 184 184 0 0 1 384 204"
                      pathLength="100"
                      className={s.track}
                    />
                    {metrics.completion_percent !== null && (
                      <path
                        d="M 16 204 A 184 184 0 0 1 384 204"
                        pathLength="100"
                        strokeDasharray={`${metrics.completion_percent} 100`}
                        className={s.fill}
                      />
                    )}
                  </svg>
                  <div className={s.gaugeValue}>
                    <span className={s.pill}>
                      {metrics.assignments_in_period
                        ? t("{v0} из {v1}", {
                            v0: metrics.completed_in_period,
                            v1: metrics.assignments_in_period,
                          })
                        : t("Нет назначений")}
                    </span>
                    <strong>{percent(metrics.completion_percent)}</strong>
                  </div>
                </div>
                <p className={s.caption}>
                  {t("Для назначений, выданных за выбранный период")}
                </p>
              </section>
              <section className={`${s.card} ${s.courses}`}>
                <header>
                  <h2>{t("Курсы")}</h2>
                  <Link
                    className={s.roundLink}
                    aria-label={t("Открыть курсы обучения")}
                    to={
                      permissions.data?.can_manage_team
                        ? "/assignments"
                        : "/learning"
                    }
                  >
                    ↗
                  </Link>
                </header>
                <div className={s.courseMetrics}>
                  <div>
                    <span>{t("Среднее время до завершения")}</span>
                    <strong>
                      {metrics.average_completion_hours === null
                        ? "—"
                        : number(metrics.average_completion_hours)}
                      {metrics.average_completion_hours !== null && (
                        <small>{t("ч")}</small>
                      )}
                    </strong>
                    <p>{t("Календарное время с назначения")}</p>
                    <div className={s.ticks} aria-hidden="true" />
                  </div>
                  <div className={s.accentMetric}>
                    <span>
                      {data.scope === "organization"
                        ? t("Курсов организации")
                        : t("Доступно курсов")}
                    </span>
                    <strong>{number(metrics.courses)}</strong>
                    <p>
                      {data.scope === "self"
                        ? t("В ваших действующих назначениях")
                        : t("В вашей области доступа")}
                    </p>
                    <div className={s.ticks} aria-hidden="true" />
                  </div>
                  <div>
                    <span>{t("Завершений курсов")}</span>
                    <strong>{number(metrics.completed_in_period)}</strong>
                    <p>{t("Из назначений за {v0} дней", { v0: days })}</p>
                    <div className={s.ticks} aria-hidden="true" />
                  </div>
                </div>
              </section>
              <section className={`${s.card} ${s.assistant}`}>
                <header>
                  <h2>{t("ИИ-Ассистент")}</h2>
                  <Link
                    className={s.roundLink}
                    aria-label={t("Открыть помощника")}
                    to={
                      permissions.data?.can_author ? "/ai-helper" : "/learning"
                    }
                  >
                    ↗
                  </Link>
                </header>
                <div className={s.assistantBody}>
                  <img
                    src="/images/learning-assistant.webp"
                    width="480"
                    height="480"
                    alt=""
                  />
                  <h3>{t("С чего начнём обучение?")}</h3>
                  <p>
                    {permissions.data?.can_author
                      ? t(
                          "Подготовьте курс из своих материалов или продолжите работу с помощником.",
                        )
                      : t(
                          "Откройте назначенный курс: помощник отвечает по материалам конкретного урока.",
                        )}
                  </p>
                </div>
                <div className={s.assistantActions}>
                  {permissions.data?.can_author ? (
                    <>
                      <Link to="/express">{t("Курс из документов")}</Link>
                      <Link to="/templates">{t("Выбрать сценарий")}</Link>
                    </>
                  ) : (
                    <Link to="/learning">{t("Продолжить обучение")}</Link>
                  )}
                </div>
                <Link
                  className={s.assistantFooter}
                  to={permissions.data?.can_author ? "/ai-helper" : "/learning"}
                >
                  <span>
                    {permissions.data?.can_author
                      ? t("Перейти к моим материалам")
                      : t("Открыть моё обучение")}
                  </span>
                  <span className={s.roundLink} aria-hidden="true">
                    ↑
                  </span>
                </Link>
              </section>
              <section className={`${s.card} ${s.people}`}>
                <header>
                  <h2>
                    {metrics.people === null
                      ? t("Назначений")
                      : t("Участников")}
                  </h2>
                  <Link
                    className={s.roundLink}
                    aria-label={
                      metrics.people === null
                        ? t("Открыть назначения")
                        : t("Открыть участников")
                    }
                    to={
                      metrics.people === null
                        ? "/learning"
                        : permissions.data?.can_manage_team
                          ? "/employees"
                          : "/learning-analytics"
                    }
                  >
                    ↗
                  </Link>
                </header>
                <strong className={s.largeNumber}>
                  {number(metrics.people ?? metrics.active_assignments)}
                </strong>
                <p className={s.caption}>
                  {metrics.people === null
                    ? t("Действующие назначения")
                    : t("В вашей области доступа")}
                </p>
              </section>
              <section className={`${s.card} ${s.lessons}`}>
                <div
                  className={s.circleGauge}
                  role="img"
                  aria-label={t("Завершено {v0} из {v1} уроков", {
                    v0: metrics.completed_lessons,
                    v1: metrics.assigned_lessons,
                  })}
                >
                  <svg viewBox="0 0 240 240" aria-hidden="true">
                    <circle cx="120" cy="120" r="110" className={s.track} />
                    {metrics.lesson_completion_percent !== null && (
                      <circle
                        cx="120"
                        cy="120"
                        r="110"
                        pathLength="100"
                        strokeDasharray={`${metrics.lesson_completion_percent} 100`}
                        transform="rotate(-90 120 120)"
                        className={s.fill}
                      />
                    )}
                  </svg>
                  <div>
                    <strong>
                      {percent(metrics.lesson_completion_percent)}
                    </strong>
                    <span>{t("Завершённость уроков")}</span>
                    <small>
                      {t("{v0} из {v1}", {
                        v0: metrics.completed_lessons,
                        v1: metrics.assigned_lessons,
                      })}
                    </small>
                  </div>
                </div>
              </section>
              <section className={`${s.card} ${s.activity}`}>
                <header>
                  <h2>{t("Активность обучения")}</h2>
                  <label className={s.period}>
                    <span className={s.srOnly}>{t("Период активности")}</span>
                    <select
                      value={activityDays}
                      onChange={(event) =>
                        setActivityDays(Number(event.target.value))
                      }
                    >
                      {[7, 14, 30].map((value) => (
                        <option value={value} key={value}>
                          {t("{v0} дней", { v0: value })}
                        </option>
                      ))}
                    </select>
                  </label>
                </header>
                <strong className={s.activityTotal}>
                  {number(metrics.submitted_attempts)}{" "}
                  <small>{t("ответов")}</small>
                </strong>
                <p className={s.caption}>
                  {t("Отправленные попытки · по дням UTC")}
                </p>
                <figure className={s.chart}>
                  <figcaption className={s.srOnly}>
                    {t("Отправленные ответы за {v0} дней", {
                      v0: activityDays,
                    })}
                  </figcaption>
                  <div className={s.columns}>
                    {data.daily.map((day, index) => (
                      <div className={s.column} key={day.date}>
                        <span className={s.barValue}>
                          {day.submitted_attempts || ""}
                        </span>
                        <div
                          className={`${s.bar} ${day.submitted_attempts === maxActivity ? s.highlight : ""}`}
                          style={{
                            height: `${(day.submitted_attempts / maxActivity) * 100}%`,
                          }}
                          title={`${date(day.date)}: ${day.submitted_attempts}`}
                        />
                        <span className={s.day}>
                          {activityDays === 7
                            ? date(day.date, true)
                            : index === 0 ||
                                index === data.daily.length - 1 ||
                                index % 5 === 0
                              ? date(day.date)
                              : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  {!metrics.submitted_attempts && (
                    <p className={s.chartEmpty}>
                      {t("За этот период ответы ещё не отправляли")}
                    </p>
                  )}
                </figure>
                <details className={s.tableDetails}>
                  <summary>{t("Данные по дням")}</summary>
                  <table>
                    <thead>
                      <tr>
                        <th>{t("Дата")}</th>
                        <th>{t("Отправленные ответы")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.daily.map((day) => (
                        <tr key={day.date}>
                          <td>{date(day.date)}</td>
                          <td>{day.submitted_attempts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </section>
            </div>
            <div className={s.footer}>
              <p>
                {t("Ожидают проверки: {v0}", { v0: metrics.pending_review })}
              </p>
              <Link
                to={
                  permissions.data?.can_review
                    ? "/reviews"
                    : permissions.data?.can_report
                      ? "/learning-analytics"
                      : "/learning"
                }
              >
                {permissions.data?.can_review
                  ? t("Открыть очередь проверки →")
                  : permissions.data?.can_report
                    ? t("Подробная аналитика →")
                    : t("Перейти к результатам →")}
              </Link>
              <details>
                <summary>{t("Как считаются показатели")}</summary>
                <p>
                  {t(
                    "Завершение — доля выполненных действующих назначений, выданных за выбранный период. Время — календарные часы от назначения до завершения, без оценки активного чтения. Уроки — отмеченные завершёнными уроки во всех действующих назначениях. Активность — отправленные попытки, включая пересдачи; черновики и повтор одного запроса не учитываются.",
                  )}
                </p>
                <p>
                  {t(
                    "Данные ограничены вашими правами. Отозванные назначения исключены из показателей прохождения; история отправленных ответов сохраняется.",
                  )}
                </p>
              </details>
            </div>
          </>
        )}
      </main>
    </>
  );
}
