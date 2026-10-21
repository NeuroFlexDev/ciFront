import { useState } from "react";
import { useLocale } from "@/i18n/useLocale";
import { useLearningData } from "@/Pages/Learning/useLearningData";
import { useDurableState } from "@/hooks/useDurableState";
import { api } from "@/shared/api";
import { ApiError } from "@/shared/errors";
import { RequestError, LoadingState } from "@/Components/RequestState";
import DraftNotice from "@/Components/DraftNotice";
import { styles } from "@/Pages/Workspace/shared";

type Limits = {
  queued_limit: number;
  background_limit: number;
  interactive_limit: number;
  monthly_tokens: number;
  monthly_ocr_pages: number;
  monthly_rub: string;
};
type Policy = {
  revision: string;
  disk_bytes_limit: number;
  image_monthly_limit: number;
  chat_monthly_limit: number;
  used_disk_bytes: number;
  resource_limits: Limits;
};
const labels: Record<keyof Limits, string> = {
  queued_limit: "Заданий в очереди организации",
  background_limit: "Одновременных фоновых заданий",
  interactive_limit: "Одновременных запросов к помощнику",
  monthly_tokens: "Токенов AI в месяц",
  monthly_ocr_pages: "Страниц OCR в месяц",
  monthly_rub: "Бюджет AI в месяц, ₽",
};
const caps: Record<keyof Limits, number> = {
  queued_limit: 100000,
  background_limit: 1000,
  interactive_limit: 1000,
  monthly_tokens: 10 ** 12,
  monthly_ocr_pages: 10 ** 8,
  monthly_rub: 10 ** 10,
};

export default function OrganizationResourcePolicy({
  organizationId,
}: {
  organizationId: string;
}) {
  const { t } = useLocale();
  const state = useLearningData<Policy>(
    `/admin/organizations/${organizationId}/material-policy`,
  );
  return (
    <>
      {!!state.error && (
        <RequestError error={state.error} onRetry={() => void state.reload()} />
      )}
      {state.loading && !state.data && (
        <LoadingState>{t("Загружаем квоты…")}</LoadingState>
      )}
      {state.data && (
        <PolicyForm
          key={organizationId}
          organizationId={organizationId}
          server={state.data}
          reload={state.reload}
        />
      )}
    </>
  );
}

function PolicyForm({
  organizationId,
  server,
  reload,
}: {
  organizationId: string;
  server: Policy;
  reload: () => Promise<unknown>;
}) {
  const { t, locale } = useLocale();
  const initial = {
    disk_bytes_limit: server.disk_bytes_limit,
    image_monthly_limit: server.image_monthly_limit,
    chat_monthly_limit: server.chat_monthly_limit,
    resource_limits: server.resource_limits,
    expected_revision: server.revision,
  };
  const [draft, setDraft, clearDraft] = useDurableState(
    `material-quota:${organizationId}`,
    initial,
  );
  const form = {
    ...draft,
    resource_limits: draft.resource_limits ?? server.resource_limits,
    expected_revision: draft.expected_revision ?? server.revision,
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const conflict =
    !!form.expected_revision && form.expected_revision !== server.revision;
  async function save() {
    if (busy || conflict) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const { data } = await api.put<Policy>(
        `/admin/organizations/${organizationId}/material-policy`,
        form,
      );
      const next = {
        ...form,
        expected_revision: data.revision,
        resource_limits: data.resource_limits,
      };
      setDraft(next);
      clearDraft(next);
      setSaved(true);
      await reload();
    } catch (reason) {
      setError(reason);
      if (reason instanceof ApiError && reason.status === 409) await reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.panel}>
      <h2>{t("Материалы и ИИ")}</h2>
      <p>
        {t("Занято хранилища:")}{" "}
        {(server.used_disk_bytes / 1024 ** 3).toLocaleString(
          locale === "en" ? "en-GB" : "ru-RU",
          { maximumFractionDigits: 3 },
        )}{" "}
        {t("ГиБ. Снижение лимита не удаляет существующие файлы.")}
      </p>
      <p>
        {t(
          "Эти квоты действуют только для выбранной организации. Общие ограничения установки остаются верхней границей.",
        )}
      </p>
      <DraftNotice />
      {!!error && <RequestError error={error} />}
      {saved && <p role="status">{t("Квоты сохранены")}</p>}
      {conflict && (
        <section className={styles.empty}>
          <h3>{t("Квоты изменены другим оператором")}</h3>
          <p>
            {t(
              "Ваш черновик сохранён. Сравните текущие значения перед повторным сохранением.",
            )}
          </p>
          <dl>
            <div><dt>{t("Лимит хранилища, ГиБ")}</dt><dd>{server.disk_bytes_limit / 1024 ** 3}</dd></div>
            <div><dt>{t("Генераций изображений в месяц")}</dt><dd>{server.image_monthly_limit}</dd></div>
            <div><dt>{t("Запросов к помощнику в месяц")}</dt><dd>{server.chat_monthly_limit}</dd></div>
            {Object.entries(server.resource_limits ?? {}).map(
              ([key, value]) => (
                <div key={key}>
                  <dt>{t(labels[key as keyof Limits])}</dt>
                  <dd>{value}</dd>
                </div>
              ),
            )}
          </dl>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              setDraft({ ...form, expected_revision: server.revision });
              setError(null);
            }}
          >
            {t("Применить мой черновик к текущей версии")}
          </button>
        </section>
      )}
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label>
          {t("Лимит хранилища, ГиБ")}
          <input
            type="number"
            min={0}
            max={1048576}
            step={0.001}
            required
            disabled={busy}
            value={form.disk_bytes_limit / 1024 ** 3}
            onChange={(event) =>
              setDraft({
                ...form,
                disk_bytes_limit: Math.round(
                  Number(event.target.value) * 1024 ** 3,
                ),
              })
            }
          />
        </label>
        <label>
          {t("Генераций изображений в месяц")}
          <input
            type="number"
            min={0}
            max={1000000}
            required
            disabled={busy}
            value={form.image_monthly_limit}
            onChange={(event) =>
              setDraft({
                ...form,
                image_monthly_limit: Number(event.target.value),
              })
            }
          />
        </label>
        <label>
          {t("Запросов к помощнику в месяц")}
          <input
            type="number"
            min={0}
            max={10000000}
            required
            disabled={busy}
            value={form.chat_monthly_limit}
            onChange={(event) =>
              setDraft({
                ...form,
                chat_monthly_limit: Number(event.target.value),
              })
            }
          />
        </label>
        {(Object.keys(labels) as (keyof Limits)[]).map((key) => (
          <label key={key}>
            {t(labels[key])}
            <input
              type="number"
              min={0}
              max={caps[key]}
              step={key === "monthly_rub" ? "0.000001" : "1"}
              required
              disabled={busy}
              value={form.resource_limits?.[key] ?? ""}
              onChange={(event) =>
                setDraft({
                  ...form,
                  resource_limits: {
                    ...form.resource_limits,
                    [key]:
                      key === "monthly_rub"
                        ? event.target.value
                        : Number(event.target.value),
                  },
                })
              }
            />
          </label>
        ))}
        <p className={styles.span}>
          {t(
            "Нулевой лимит блокирует новые операции этого типа. Резервы неизвестных ответов сохраняются; автоматических платных повторов нет.",
          )}
        </p>
        <button className={styles.primary} disabled={busy || conflict}>
          {busy ? t("Сохраняем…") : t("Сохранить квоты")}
        </button>
      </form>
    </section>
  );
}
