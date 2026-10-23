import { useLocale } from "@/i18n/useLocale";
import { useLearningData } from "@/Pages/Learning/useLearningData";
import { RequestError, LoadingState } from "@/Components/RequestState";
import { styles } from "@/Pages/Workspace/shared";

type Usage = {
  ai_unlimited?: boolean;
  month: string;
  tokens_reserved_or_used: number;
  tokens_limit: number;
  ocr_pages_reserved_or_used: number;
  ocr_pages_limit: number;
  cost_rub_reserved_upper_bound: string;
  cost_rub_limit: string;
  used_disk_bytes: number;
  disk_bytes_limit: number;
  images_this_month: number;
  image_monthly_limit: number;
  interactive_requests_this_month: number;
  chat_monthly_limit: number;
  background_running: number;
  background_running_limit: number;
  interactive_running: number;
  interactive_running_limit: number;
  queued: number;
  queued_limit: number;
};

export default function ResourceUsagePanel() {
  const { t, locale } = useLocale();
  const { data, error, loading, reload } = useLearningData<Usage>(
    "/materials/resource-usage",
  );
  const number = (value: number | string) =>
    Number(value).toLocaleString(locale === "en" ? "en-GB" : "ru-RU", {
      maximumFractionDigits: 3,
    });
  const rows = data
    ? ([
        ["Токены AI", data.tokens_reserved_or_used, data.tokens_limit],
        ["Страницы OCR", data.ocr_pages_reserved_or_used, data.ocr_pages_limit],
        [
          "Верхняя оценка расходов, ₽",
          data.cost_rub_reserved_upper_bound,
          data.cost_rub_limit,
        ],
        [
          "Хранилище, ГиБ",
          data.used_disk_bytes / 1024 ** 3,
          data.disk_bytes_limit / 1024 ** 3,
        ],
        [
          "Изображения за месяц",
          data.images_this_month,
          data.image_monthly_limit,
        ],
        [
          "Учтённые запросы к помощнику",
          data.interactive_requests_this_month,
          data.chat_monthly_limit,
        ],
        [
          "Фоновые задания сейчас",
          data.background_running,
          data.background_running_limit,
        ],
        [
          "Интерактивные запросы сейчас",
          data.interactive_running,
          data.interactive_running_limit,
        ],
        ["Задания в очереди", data.queued, data.queued_limit],
      ] as const)
    : [];
  return (
    <section className={styles.panel}>
      <h2>{t("Ресурсы организации")}</h2>
      <p>
        {t(
          "Лимиты применяются ко всей организации. Снижение лимита сохраняет существующие материалы.",
        )}
      </p>
      {!!error && <RequestError error={error} onRetry={() => void reload()} />}
      {loading && !data && (
        <LoadingState>{t("Загружаем расход ресурсов…")}</LoadingState>
      )}
      {data && (
        <>
          <p>
            {t("Расчётный месяц:")} {data.month.slice(0, 7)}
          </p>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("Ресурс")}</th>
                  <th>{t("Использовано / зарезервировано")}</th>
                  <th>{t("Лимит")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, used, limit]) => (
                  <tr key={label}>
                    <th scope="row">{t(label)}</th>
                    <td>{number(used)}</td>
                    <td>{data.ai_unlimited && ["Токены AI", "Страницы OCR", "Верхняя оценка расходов, ₽", "Изображения за месяц", "Учтённые запросы к помощнику"].includes(label) ? t("Без лимита") : number(limit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            {t(
              "Стоимость включает резерв незавершённых и неопределённых запросов. Это верхняя оценка, а не счёт провайдера. История до включения учёта может быть неполной.",
            )}
          </p>
          <p>
            {t(
              "Чат использует отдельные слоты и не ждёт окончания генерации курса. При исчерпании бюджета чтение уроков и отправка ответов остаются доступны.",
            )}
          </p>
        </>
      )}
      <button
        type="button"
        className={styles.secondary}
        disabled={loading}
        onClick={() => void reload()}
      >
        {t("Обновить расход")}
      </button>
    </section>
  );
}
