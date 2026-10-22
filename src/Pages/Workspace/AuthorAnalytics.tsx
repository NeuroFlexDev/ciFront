import { useLocale, getLocale } from "@/i18n/useLocale";
import { RequestError, LoadingState } from "@/Components/RequestState";
import { useReconnect } from "@/hooks/useReconnect";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/shared/api";
import { useAuth } from "@/auth/useAuth";
import {
  Shell,
  Stat,
  styles,
  statuses,
  dateText,
  type Overview,
} from "./shared";
export default function AuthorAnalytics({
  analytics = false,
}: {
  analytics?: boolean;
}) {
  const { t } = useLocale();

  const { user } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  useReconnect(() => setVersion((v) => v + 1));
  useEffect(() => {
    let active = true;
    api
      .get<Overview>("/workspace/overview")
      .then((r) => {
        if (active) {
          setData(r.data);
          setError(null);
        }
      })
      .catch((e) => {
        if (active) setError(e);
      });
    return () => {
      active = false;
    };
  }, [version]);
  return (
    <Shell
      title={analytics ? t("Аналитика моей работы") : t("Рабочее пространство")}
      description={
        analytics
          ? t(
              "Курсы и источники — за всё время. Запуски и использование AI — за последние 30 дней.",
            )
          : t("{v0} — продолжите работу с курсами или начните новый.", {
              v0: user?.full_name || t("Добро пожаловать"),
            })
      }
      action={
        <Link className={styles.primary} to="/express">
          {t("Создать курс +")}
        </Link>
      }
    >
      {!!error && (
        <RequestError error={error} onRetry={() => setVersion((v) => v + 1)} />
      )}
      {!data && !error && (
        <LoadingState>{t("Загружаем ваши данные…")}</LoadingState>
      )}
      {data && (
        <>
          <div className={styles.stats}>
            <Stat label={t("Мои курсы")} value={data.metrics.courses} />
            <Stat label={t("Опубликовано")} value={data.metrics.published} />
            <Stat label={t("Источники")} value={data.metrics.documents} />
            <Stat label={t("Запуски за 30 дней")} value={data.metrics.runs} />
          </div>
          {analytics ? (
            <>
              <div className={styles.stats}>
                <Stat
                  label={t("Завершённые запуски")}
                  value={data.metrics.completed}
                />
                <Stat label={t("Ошибки")} value={data.metrics.failed} />
                <Stat
                  label={t("В работе / на паузе")}
                  value={data.metrics.active}
                />
                <Stat
                  label={t("Учтённая стоимость, USD")}
                  value={
                    data.metrics.known_cost_usd === null
                      ? t("Нет данных")
                      : data.metrics.known_cost_usd.toFixed(3)
                  }
                />
              </div>
              <section className={styles.panel}>
                <h2>{t("Использование моделей")}</h2>
                <p>
                  {t("Входящие токены:") + " "}
                  {data.metrics.input_tokens.toLocaleString(
                    getLocale() === "en" ? "en-GB" : "ru-RU",
                  )}
                  {" " + t("· Исходящие:") + " "}
                  {data.metrics.output_tokens.toLocaleString(
                    getLocale() === "en" ? "en-GB" : "ru-RU",
                  )}
                  {" " + t("· Кешированные:") + " "}
                  {data.metrics.cached_tokens.toLocaleString(
                    getLocale() === "en" ? "en-GB" : "ru-RU",
                  )}
                </p>
                <p>
                  {t(
                    "Стоимость показывается только для запусков, по которым она сохранена. Это не счёт на оплату.",
                  )}
                </p>
                <h3>{t("Запуски по дням")}</h3>
                {!data.daily.length ? (
                  <p>{t("После первого запуска здесь появится история.")}</p>
                ) : (
                  <div className={styles.chart}>
                    {data.daily.map((d) => (
                      <div key={d.date} className={styles.barRow}>
                        <span>{d.date}</span>
                        <div
                          className={styles.bar}
                          style={{
                            width: `${(d.count / Math.max(...data.daily.map((x) => x.count))) * 100}%`,
                          }}
                        />
                        <strong>{d.count}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              <div className={styles.between}>
                <h2>{t("Последние курсы")}</h2>
                <Link to="/courses">{t("Все курсы →")}</Link>
              </div>
              {!data.courses.length ? (
                <section className={styles.empty}>
                  <h2>{t("Начните с ваших материалов")}</h2>
                  <p>
                    {t(
                      "Добавьте PDF, DOCX или TXT, укажите цель обучения и подготовьте первый курс.",
                    )}
                  </p>
                  <Link className={styles.primary} to="/express">
                    {t("Создать первый курс")}
                  </Link>{" "}
                  <Link className={styles.secondary} to="/templates">
                    {t("Выбрать сценарий")}
                  </Link>
                </section>
              ) : (
                <div className={styles.grid}>
                  {data.courses.map((c) => (
                    <article className={styles.card} key={c.id}>
                      <span className={styles.badge}>
                        {t(statuses[c.status] ?? String(c.status)) || c.status}
                      </span>
                      <h3 style={{ marginTop: 18 }}>
                        {c.title?.trim() || t("Черновик №{v0}", { v0: c.id })}
                      </h3>
                      <p>
                        {t(
                          statuses[c.publication_status] ??
                            String(c.publication_status),
                        ) || c.publication_status}
                      </p>
                      <Link
                        className={styles.secondary}
                        to={
                          c.status === "ready"
                            ? `/courses/${c.id}/edit`
                            : `/express?course=${c.id}`
                        }
                      >
                        {t("Продолжить работу →")}
                      </Link>
                    </article>
                  ))}
                </div>
              )}
              <section className={styles.panel}>
                <h2>{t("Быстрые действия")}</h2>
                <div className={styles.row}>
                  <Link className={styles.secondary} to="/account">
                    {t("Профиль и безопасность")}
                  </Link>
                  <Link className={styles.secondary} to="/analytics">
                    {t("Моя аналитика")}
                  </Link>
                  {user?.organization_id && (
                    <Link className={styles.secondary} to="/employees">
                      {t("Команда")}
                    </Link>
                  )}
                  {user?.is_admin && (
                    <Link className={styles.primary} to="/admin">
                      {t("Админка Лерниума")}
                    </Link>
                  )}
                </div>
              </section>
            </>
          )}
          <section className={styles.panel}>
            <div className={styles.between}>
              <h2>{t("История запусков")}</h2>
              <button
                className={styles.secondary}
                onClick={() => setVersion((v) => v + 1)}
              >
                {t("Обновить")}
              </button>
            </div>
            {!data.runs.length ? (
              <p>
                {t(
                  "Запусков пока нет. История появится после обработки материалов и генерации.",
                )}
              </p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t("Запуск")}</th>
                      <th>{t("Статус")}</th>
                      <th>{t("Прогресс")}</th>
                      <th>{t("Дата")}</th>
                      <th>{t("Действие")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.runs.map((r) => (
                      <tr key={r.id}>
                        <td>
                          №{r.id}
                          <small>
                            {t("Курс №")}
                            {r.course_id}
                          </small>
                        </td>
                        <td>
                          {t(statuses[r.status] ?? String(r.status)) ||
                            r.status}
                          {r.error_message && <small>{r.error_message}</small>}
                        </td>
                        <td>
                          {r.progress_percent}%
                          <progress
                            className={styles.progress}
                            max={100}
                            value={r.progress_percent}
                          />
                        </td>
                        <td>{dateText(r.created_at)}</td>
                        <td>
                          {r.course_id && (
                            <Link
                              to={`/express?course=${r.course_id}&run=${r.id}`}
                            >
                              {t("Открыть")}
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </Shell>
  );
}
