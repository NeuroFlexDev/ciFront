import { useLocale } from "@/i18n/useLocale";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { api } from "@/shared/api";
import { ApiError } from "@/shared/errors";
import { useDurableState } from "@/hooks/useDurableState";
import { useLearningData } from "@/Pages/Learning/useLearningData";
import type { TeamSettings } from "@/Pages/TeamLearning/types";
import { Shell, styles } from "@/Pages/Workspace/shared";
import StatusPage from "@/Pages/AccessPage/StatusPage";
import { RequestError, LoadingState } from "@/Components/RequestState";
import DraftNotice from "@/Components/DraftNotice";
type Policy = {
  disk_bytes_limit: number;
  image_monthly_limit: number;
  chat_monthly_limit: number;
  used_disk_bytes: number;
};
const features: Record<string, string> = {
  learning: "Обучение и назначения",
  authoring: "Создание и редактирование курсов",
  assistant: "ИИ-помощник",
  ai_grading: "Предложения ИИ для проверки работ",
  programs: "Программы обучения",
  integrations: "Внешние интеграции",
  images: "Загрузка и генерация иллюстраций",
};
const profiles: Record<string, string> = {
  business: "Компания",
  education: "Образовательная организация",
  training_center: "Учебный центр",
  government: "Государственная организация",
  individual: "Индивидуальное пространство",
};
export default function DeliveryPage() {
  const { t } = useLocale();
  const { organizationId } = useParams();
  const { user } = useAuth();
  const data = useLearningData<TeamSettings>(
    user?.is_admin ? `/admin/organizations/${organizationId}/delivery` : null,
  );
  const policy = useLearningData<Policy>(
    user?.is_admin
      ? `/admin/organizations/${organizationId}/material-policy`
      : null,
  );
  if (!user?.is_admin)
    return (
      <StatusPage
        code="403"
        title={t("Доступ ограничен")}
        description={t("Настройки поставки доступны оператору платформы.")}
      />
    );
  return (
    <Shell
      title={t("Поставка организации №{v0}", { v0: organizationId ?? "" })}
      description={t(
        "Функции, профиль и квоты. Каждое изменение сохраняется в журнале действий.",
      )}
    >
      <p>
        <Link to="/admin?tab=organizations">{t("← Заказчики")}</Link> ·{" "}
        <Link to={`/admin/organizations/${organizationId}/billing`}>
          {t("Договор и счета")}
        </Link>
      </p>
      {!!data.error && (
        <RequestError error={data.error} onRetry={() => void data.reload()} />
      )}{" "}
      {!data.data && data.loading && (
        <LoadingState>{t("Загружаем состав поставки…")}</LoadingState>
      )}
      {data.data && (
        <DeliveryForm
          key={organizationId}
          organizationId={organizationId!}
          server={data.data}
          reload={data.reload}
        />
      )}
      {!!policy.error && (
        <RequestError
          error={policy.error}
          onRetry={() => void policy.reload()}
        />
      )}{" "}
      {policy.data && (
        <QuotaForm
          key={`quota:${organizationId}`}
          organizationId={organizationId!}
          server={policy.data}
          reload={policy.reload}
        />
      )}
    </Shell>
  );
}
function DeliveryForm({
  organizationId,
  server,
  reload,
}: {
  organizationId: string;
  server: TeamSettings;
  reload: () => Promise<unknown>;
}) {
  const { t } = useLocale();
  const [form, setForm, clearForm] = useDurableState(
    `delivery:${organizationId}`,
    {
      expected_revision: server.revision,
      features: server.features,
      delivery: server.delivery,
      profile: server.profile,
      languages: server.languages,
      role_labels: server.role_labels,
      ai_context: server.ai_context,
    },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const conflict = form.expected_revision !== server.revision;
  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      const { data } = await api.put<TeamSettings>(
        `/admin/organizations/${organizationId}/delivery`,
        form,
      );
      const saved = { ...form, expected_revision: data.revision };
      setForm(saved);
      clearForm(saved);
      setNotice(t("Состав поставки сохранён"));
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
      <h2>{t("Состав поставки")}</h2>
      <DraftNotice />
      {!!error && <RequestError error={error} />}{" "}
      {notice && <p role="status">{notice}</p>}
      {conflict && (
        <section className={styles.empty}>
          <h3>{t("Параметры изменены другим оператором")}</h3>
          <p>
            {t("Ваш черновик сохранён. Текущий профиль:")}{" "}
            {t(profiles[server.profile] ?? server.profile)}
            {t(", языки:")} {server.languages.join(", ")}.
          </p>
          <ul>
            {Object.entries(features).map(([key, title]) => (
              <li key={key}>
                {t(title)}:{" "}
                {server.features[key] === false
                  ? t("выключено")
                  : key === "ai_grading" && !server.features[key]
                    ? t("выключено")
                    : t("включено")}
              </li>
            ))}
          </ul>
          <button
            className={styles.secondary}
            onClick={() =>
              setForm({ ...form, expected_revision: server.revision })
            }
          >
            {t("Использовать мои параметры вместо этой версии")}
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
          {t("Профиль")}
          <select
            value={form.profile}
            disabled={busy}
            onChange={(event) =>
              setForm({ ...form, profile: event.target.value })
            }
          >
            {Object.entries(profiles).map(([key, title]) => (
              <option key={key} value={key}>
                {t(title)}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>{t("Языки интерфейса и обучения")}</legend>
          {[
            ["ru", t("Русский")],
            ["en", "English"],
          ].map(([code, title]) => (
            <label className={styles.check} key={code}>
              <input
                type="checkbox"
                disabled={
                  busy ||
                  (form.languages.length === 1 && form.languages.includes(code))
                }
                checked={form.languages.includes(code)}
                onChange={(event) =>
                  setForm({
                    ...form,
                    languages: event.target.checked
                      ? [...form.languages, code]
                      : form.languages.filter((value) => value !== code),
                  })
                }
              />
              {t(title)}
            </label>
          ))}
        </fieldset>
        <fieldset className={styles.span}>
          <legend>{t("Включённые функции")}</legend>
          <div className={styles.grid}>
            {Object.entries(features).map(([key, title]) => (
              <label key={key} className={styles.check}>
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={form.features[key] ?? key !== "ai_grading"}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      features: {
                        ...form.features,
                        [key]: event.target.checked,
                      },
                    })
                  }
                />
                {t(title)}
              </label>
            ))}
          </div>
          <p>
            {t(
              "Отключение ограничивает новые операции. Существующие результаты и опубликованные материалы сохраняются.",
            )}
          </p>
        </fieldset>
        <label>
          {t("Зафиксированный способ размещения")}
          <select
            value={String(form.delivery.deployment_mode ?? "cloud")}
            disabled={busy}
            onChange={(event) =>
              setForm({
                ...form,
                delivery: {
                  ...form.delivery,
                  deployment_mode: event.target.value,
                },
              })
            }
          >
            <option value="cloud">{t("Облако Лерниума")}</option>
            <option value="customer_private">{t("Установка заказчика")}</option>
          </select>
        </label>
        <label>
          {t("Контакт сопровождения")}
          <input
            maxLength={200}
            disabled={busy}
            value={String(form.delivery.support_contact ?? "")}
            onChange={(event) =>
              setForm({
                ...form,
                delivery: {
                  ...form.delivery,
                  support_contact: event.target.value,
                },
              })
            }
          />
        </label>
        <p className={styles.span}>
          {t(
            "Способ размещения фиксируется для передачи и сопровождения. Адреса AI-сервисов, секреты и сеть настраиваются в установленном комплекте.",
          )}{" "}
          <Link to="/admin/operations">{t("Проверить текущую установку")}</Link>
        </p>
        <fieldset className={styles.span}>
          <legend>{t("Контекст обучения для ИИ")}</legend>
          <div className={styles.form}>
            {[
              ["audience", t("Аудитория")],
              ["specialist_role", t("Роль специалиста")],
              ["industry", t("Отрасль")],
              ["goals", t("Требуемый результат")],
              ["terminology", t("Терминология")],
              ["constraints", t("Ограничения")],
            ].map(([key, title]) => (
              <label key={key}>
                {t(title)}
                <textarea
                  maxLength={2000}
                  disabled={busy}
                  value={form.ai_context[key] ?? ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      ai_context: {
                        ...form.ai_context,
                        [key]: event.target.value,
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>
        <button className={styles.primary} disabled={busy || conflict}>
          {busy ? t("Сохраняем…") : t("Сохранить состав поставки")}
        </button>
      </form>
    </section>
  );
}
function QuotaForm({
  organizationId,
  server,
  reload,
}: {
  organizationId: string;
  server: Policy;
  reload: () => Promise<unknown>;
}) {
  const { t, locale } = useLocale();
  const [form, setForm, clearForm] = useDurableState(
    `material-quota:${organizationId}`,
    {
      disk_bytes_limit: server.disk_bytes_limit,
      image_monthly_limit: server.image_monthly_limit,
      chat_monthly_limit: server.chat_monthly_limit,
    },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      await api.put(
        `/admin/organizations/${organizationId}/material-policy`,
        form,
      );
      clearForm(form);
      setNotice(t("Квоты сохранены"));
      await reload();
    } catch (reason) {
      setError(reason);
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
      <DraftNotice />
      {!!error && <RequestError error={error} />}{" "}
      {notice && <p role="status">{notice}</p>}
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
            disabled={busy}
            required
            value={form.disk_bytes_limit / 1024 ** 3}
            onChange={(event) =>
              setForm({
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
            disabled={busy}
            required
            value={form.image_monthly_limit}
            onChange={(event) =>
              setForm({
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
            disabled={busy}
            required
            value={form.chat_monthly_limit}
            onChange={(event) =>
              setForm({
                ...form,
                chat_monthly_limit: Number(event.target.value),
              })
            }
          />
        </label>
        <button className={styles.primary} disabled={busy}>
          {busy ? t("Сохраняем…") : t("Сохранить квоты")}
        </button>
      </form>
    </section>
  );
}
