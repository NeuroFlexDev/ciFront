import { useLocale } from "@/i18n/useLocale";
import { Link } from "react-router-dom";
import { Shell, styles } from "./shared";
import { templates } from "./template-data";
export default function Templates() {
  const { t } = useLocale();
  return (
    <Shell
      title={t("Сценарии курса")}
      description={t(
        "Выберите основу настроек. Содержание курса будет подготовлено из ваших источников.",
      )}
    >
      <div className={styles.grid}>
        {templates.map((template) => (
          <article key={template.id} className={styles.card}>
            <h2>{t(template.title)}</h2>
            <p>{t(template.description)}</p>
            <p>
              {template.lessons}
              {" " + t("уроков · настройки можно изменить")}
            </p>
            <Link
              className={styles.primary}
              to={`/express?template=${template.id}`}
            >
              {t("Использовать сценарий →")}
            </Link>
          </article>
        ))}
      </div>
    </Shell>
  );
}
