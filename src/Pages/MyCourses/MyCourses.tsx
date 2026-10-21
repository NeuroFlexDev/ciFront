import { useLocale } from "@/i18n/useLocale";
import { RequestError, LoadingState } from "@/Components/RequestState";
import { useReconnect } from "@/hooks/useReconnect";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/shared/api";
import { Shell, styles } from "@/Pages/Workspace/shared";
type Course = {
  id: number;
  title: string | null;
  publication_status: string;
  module_count: number;
  lesson_count: number;
};
export default function MyCoursesPage() {
  const { t } = useLocale();

  const [courses, setCourses] = useState<Course[]>([]);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState("");
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  useReconnect(() => setVersion((v) => v + 1));
  useEffect(() => {
    let stopped = false;
    setLoading(true);
    api
      .get<Course[]>(
        `/courses/?limit=20&offset=${offset}${filter ? "&publication_status=" + filter : ""}`,
      )
      .then(({ data }) => {
        if (!stopped) {
          setCourses(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!stopped) setError(e);
      })
      .finally(() => {
        if (!stopped) setLoading(false);
      });
    return () => {
      stopped = true;
    };
  }, [offset, filter, version]);
  async function remove(course: Course) {
    if (
      !window.confirm(
        t(
          "Удалить курс «{v0}»? Он исчезнет из вашего списка, опубликованная версия станет недоступна.",
          { v0: course.title || t("Черновик №") + course.id },
        ),
      )
    )
      return;
    setRemoving(course.id);
    setError(null);
    try {
      await api.delete(`/courses/${course.id}`);
      if (courses.length === 1 && offset > 0) setOffset((n) => n - 20);
      else setVersion((n) => n + 1);
    } catch (e) {
      setError(e);
    } finally {
      setRemoving(null);
    }
  }
  return (
    <Shell
      title={t("Мои курсы")}
      description={t("Ваши материалы, черновики и опубликованные курсы.")}
      action={
        <Link className={styles.primary} to="/express">
          {t("Создать курс +")}
        </Link>
      }
    >
      <div className={styles.tabs} aria-label={t("Фильтр курсов")}>
        {[
          ["", t("Все курсы")],
          ["draft", t("Черновики")],
          ["published", t("Опубликованные")],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={filter === value}
            aria-selected={filter === value}
            onClick={() => {
              setFilter(value);
              setOffset(0);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {!!error && (
        <RequestError error={error} onRetry={() => setVersion((v) => v + 1)} />
      )}
      {loading && <LoadingState>{t("Загружаем курсы…")}</LoadingState>}
      {!loading && !courses.length && !error && (
        <section className={styles.empty}>
          <h2>
            {filter
              ? t("В этом разделе пока пусто")
              : t("Создайте первый курс")}
          </h2>
          <p>
            {t(
              "Начните со своих документов или выберите готовый сценарий настройки.",
            )}
          </p>
          <Link className={styles.primary} to="/templates">
            {t("Выбрать сценарий")}
          </Link>
        </section>
      )}
      {!loading && (
        <div className={styles.grid}>
          {courses.map((c) => (
            <article className={styles.card} key={c.id}>
              <span className={styles.badge}>
                {c.publication_status === "published"
                  ? t("Опубликован")
                  : t("Черновик")}
              </span>
              <h2 style={{ marginTop: 18 }}>
                {c.title || t("Черновик №{v0}", { v0: c.id })}
              </h2>
              <p>
                {c.module_count}
                {" " + t("модулей ·") + " "}
                {c.lesson_count}
                {" " + t("уроков")}
              </p>
              <div className={styles.row}>
                <Link
                  className={styles.primary}
                  to={
                    c.lesson_count
                      ? `/courses/${c.id}/edit`
                      : `/express?course=${c.id}`
                  }
                >
                  {c.lesson_count
                    ? t("Открыть курс")
                    : t("Продолжить создание")}
                </Link>
                <Link
                  className={styles.secondary}
                  to={`/courses/${c.id}/canvas`}
                >
                  {t("Канва")}
                </Link>
                <button
                  className={styles.danger}
                  disabled={removing !== null}
                  onClick={() => void remove(c)}
                >
                  {removing === c.id ? t("Удаляем…") : t("Удалить")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className={styles.row} style={{ marginTop: 28 }}>
        <button
          className={styles.secondary}
          disabled={offset === 0 || loading}
          onClick={() => setOffset((n) => Math.max(0, n - 20))}
        >
          {t("Назад")}
        </button>
        <button
          className={styles.secondary}
          disabled={courses.length < 20 || loading}
          onClick={() => setOffset((n) => n + 20)}
        >
          {t("Далее")}
        </button>
      </div>
    </Shell>
  );
}
