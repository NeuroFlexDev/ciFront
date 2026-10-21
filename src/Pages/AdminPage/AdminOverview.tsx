import { ArrowUpRight, Building2, Users, BookOpen, Inbox } from "lucide-react";
import { useLocale } from "@/i18n/useLocale";
import type { Overview } from "@/Pages/Workspace/shared";
import styles from "./admin.module.css";

type Data = Overview & {
  users: number;
  organizations: number;
  open_requests: number;
  unassigned_courses: number;
};

export default function AdminOverview({
  data,
  onNavigate,
}: {
  data: Data;
  onNavigate: (tab: string, unassigned?: boolean) => void;
}) {
  const { t, locale } = useLocale();
  const activity = data.daily.slice(-7);
  const maximum = Math.max(1, ...activity.map((day) => day.count));
  return (
    <div className={styles.overview}>
      <div className={styles.stats}>
        {[
          {
            label: "Заказчики",
            value: data.organizations,
            tab: "organizations",
            icon: Building2,
          },
          { label: "Аккаунты", value: data.users, tab: "users", icon: Users },
          {
            label: "Курсы",
            value: data.metrics.courses,
            tab: "courses",
            icon: BookOpen,
          },
          {
            label: "Открытые обращения",
            value: data.open_requests,
            tab: "requests",
            icon: Inbox,
          },
        ].map(({ label, value, tab, icon: Icon }) => (
          <button
            key={tab}
            className={styles.metricLink}
            onClick={() => onNavigate(tab)}
          >
            <span className={styles.metricLabel}>
              <Icon size={18} aria-hidden="true" />
              {t(label)}
            </span>
            <strong>
              {value.toLocaleString(locale === "en" ? "en-GB" : "ru-RU")}
            </strong>
            <ArrowUpRight
              className={styles.metricArrow}
              size={22}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <div className={styles.overviewGrid}>
        <section className={styles.activity}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>{t("Генерация курсов")}</span>
              <h2>{t("Активность запусков")}</h2>
            </div>
            <strong>{activity.reduce((sum, day) => sum + day.count, 0)}</strong>
          </div>
          {activity.length ? (
            <figure className={styles.activityFigure}>
              <figcaption>{t("Последние дни с данными")}</figcaption>
              <ol className={styles.activityBars}>
                {activity.map((day) => (
                  <li key={day.date}>
                    <span className={styles.activityValue}>{day.count}</span>
                    <div className={styles.barTrack}>
                      <span
                        style={{ height: `${(day.count / maximum) * 100}%` }}
                      />
                    </div>
                    <time dateTime={day.date}>
                      {new Date(day.date).toLocaleDateString(
                        locale === "en" ? "en-GB" : "ru-RU",
                        { day: "numeric", month: "short" },
                      )}
                    </time>
                  </li>
                ))}
              </ol>
            </figure>
          ) : (
            <p className={styles.empty}>{t("Нет данных")}</p>
          )}
        </section>
        <div className={styles.overviewActions}>
          <section className={styles.actionCard}>
            <Building2 size={26} aria-hidden="true" />
            <h2>{t("Подключить заказчика")}</h2>
            <p>
              {t(
                "Создайте организацию, задайте индивидуальные лимиты и выдайте приглашение её администратору.",
              )}
            </p>
            <button
              className={styles.primary}
              onClick={() => onNavigate("organizations")}
            >
              {t("Перейти к заказчикам")}
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          </section>
          <section className={styles.actionCard}>
            <h2>{t("Архивные материалы")}</h2>
            <p>
              {t("Курсов без владельца:")}{" "}
              <strong>{data.unassigned_courses}</strong>
              {t(". Назначайте их только после проверки принадлежности.")}
            </p>
            <button
              className={styles.secondary}
              onClick={() => onNavigate("courses", true)}
            >
              {t("Разобрать архив")}
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          </section>
        </div>
      </div>
      <div className={styles.runStats}>
        {[
          ["Запуски за 30 дней", data.metrics.runs],
          ["Завершено", data.metrics.completed],
          ["Ошибки", data.metrics.failed],
          [
            "Учтено расходов, USD",
            data.metrics.known_cost_usd === null
              ? t("Нет данных")
              : data.metrics.known_cost_usd.toFixed(3),
          ],
        ].map(([label, value]) => (
          <div key={label} className={styles.runStat}>
            <span>{t(String(label))}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p className={styles.footnote}>
        {t(
          "Стоимость отражает сохранённые данные запусков, а не итоговый счёт провайдера.",
        )}
      </p>
    </div>
  );
}
