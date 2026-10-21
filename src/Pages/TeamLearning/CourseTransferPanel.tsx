import { useState } from "react";
import { apiFetch } from "@/shared/api";
import { ApiError } from "@/shared/errors";
import { useLocale } from "@/i18n/useLocale";
import { LoadingState, RequestError } from "@/Components/RequestState";
import { useLearningData } from "../Learning/useLearningData";
import { dateLabel } from "../Learning/types";
import s from "../Learning/learning.module.css";

type Version = {
  course_id: number;
  course_version_id: number;
  title: string;
  revision: number;
  published_at: string;
  snapshot_sha256: string;
  source_count: number;
};

export default function CourseTransferPanel() {
  const { t } = useLocale();
  const [offset, setOffset] = useState(0);
  const query = useLearningData<{ items: Version[]; total: number }>(
    `/team/course-transfers?offset=${offset}&limit=20`,
  );
  const [selected, setSelected] = useState<Version | null>(null);
  const [sources, setSources] = useState(true),
    [keys, setKeys] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [privateConfirmed, setPrivateConfirmed] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [notice, setNotice] = useState("");
  async function download() {
    if (!selected || !confirmed || (keys && !privateConfirmed) || busy) return;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      const response = await apiFetch("/team/course-transfers/export", {
        method: "POST",
        body: JSON.stringify({
          course_version_id: selected.course_version_id,
          snapshot_sha256: selected.snapshot_sha256,
          include_sources: sources,
          include_answer_keys: keys,
          confirm_transfer: confirmed,
          confirm_private_materials: privateConfirmed,
        }),
      });
      if (!response.ok) {
        let message = t("Не удалось подготовить пакет курса.");
        try {
          const data = await response.json();
          if (typeof data.detail === "string") message = data.detail;
        } catch {
          /* Keep the actionable generic message. */
        }
        throw new ApiError(message, response.status, "http");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lernium-course-${selected.course_id}-v${selected.revision}.zip`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        t(
          "Пакет подготовлен, скачивание началось. Проверьте файлы и контрольные суммы перед передачей.",
        ),
      );
      setConfirmed(false);
      setPrivateConfirmed(false);
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={s.card}
      aria-label={t("Передача опубликованного курса")}
    >
      <h2>{t("Передача опубликованного курса")}</h2>
      <p className={s.muted}>
        {t(
          "Владелец выбирает точную опубликованную версию и состав ZIP. В пакете будут читаемый курс, структурированные данные, манифест и контрольные суммы. Участники, их ответы и результаты сюда не входят.",
        )}
      </p>
      {query.loading && !query.data && <LoadingState />}
      {!!query.error && (
        <RequestError error={query.error} onRetry={query.reload} />
      )}
      {query.data && !query.data.total && (
        <p>{t("Для передачи сначала опубликуйте курс.")}</p>
      )}
      {query.data && query.data.total > 0 && (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void download();
            }}
          >
            <fieldset
              disabled={busy}
              style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
              className={s.stack}
            >
              <label className={s.field}>
                {t("Версия для передачи")}
                <select
                  value={selected?.course_version_id ?? ""}
                  onChange={(event) => {
                    setSelected(
                      query.data!.items.find(
                        (item) =>
                          item.course_version_id === Number(event.target.value),
                      ) ?? null,
                    );
                    setConfirmed(false);
                    setPrivateConfirmed(false);
                    setKeys(false);
                    setNotice("");
                    setError(null);
                  }}
                >
                  <option value="">
                    {t("Выберите опубликованную версию")}
                  </option>
                  {query.data.items.map((item) => (
                    <option
                      key={item.course_version_id}
                      value={item.course_version_id}
                    >
                      {item.title} ·{" "}
                      {t("Версия {version}", { version: item.revision })}
                    </option>
                  ))}
                </select>
              </label>
              {selected && (
                <>
                  <p className={s.caption}>
                    {t("Опубликовано:")} {dateLabel(selected.published_at)} ·{" "}
                    {t("Разрешённых оригиналов: {count}", {
                      count: selected.source_count,
                    })}
                  </p>
                  <label className={s.row}>
                    <input
                      type="checkbox"
                      checked={sources}
                      onChange={(event) => {
                        setSources(event.target.checked);
                        setConfirmed(false);
                      }}
                    />
                    {t("Включить закреплённые оригиналы материалов")}
                  </label>
                  <label className={s.row}>
                    <input
                      type="checkbox"
                      checked={keys}
                      onChange={(event) => {
                        setKeys(event.target.checked);
                        setPrivateConfirmed(false);
                        setConfirmed(false);
                      }}
                    />
                    {t(
                      "Включить закрытые ключи ответов для передачи преподавателю",
                    )}
                  </label>
                  {keys && (
                    <label className={s.notice}>
                      <input
                        type="checkbox"
                        checked={privateConfirmed}
                        onChange={(event) =>
                          setPrivateConfirmed(event.target.checked)
                        }
                      />{" "}
                      {t(
                        "Подтверждаю передачу закрытых ключей только уполномоченному получателю, не ученикам.",
                      )}
                    </label>
                  )}
                  <label className={s.row}>
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    {t(
                      "Я подтверждаю передачу выбранной версии и указанного состава материалов.",
                    )}
                  </label>
                  <p className={s.caption}>
                    {t(
                      "Максимум пакета — 512 MiB. Черновики и неразрешённые источники исключены; внешние ссылки автора сохраняются. Действие записывается в журнал.",
                    )}
                  </p>
                  <button
                    className={s.primary}
                    disabled={busy || !confirmed || (keys && !privateConfirmed)}
                  >
                    {t(busy ? "Готовим пакет…" : "Скачать пакет курса")}
                  </button>
                </>
              )}
            </fieldset>
          </form>
          {query.data.total > 20 && (
            <div className={s.row}>
              <button
                className={s.secondary}
                disabled={busy || offset === 0}
                onClick={() => {
                  setOffset((value) => Math.max(0, value - 20));
                  setSelected(null);
                  setConfirmed(false);
                }}
              >
                {t("Назад")}
              </button>
              <span>
                {offset + 1}–{Math.min(offset + 20, query.data.total)} /{" "}
                {query.data.total}
              </span>
              <button
                className={s.secondary}
                disabled={busy || offset + 20 >= query.data.total}
                onClick={() => {
                  setOffset((value) => value + 20);
                  setSelected(null);
                  setConfirmed(false);
                }}
              >
                {t("Далее")}
              </button>
            </div>
          )}
        </>
      )}
      {!!error && (
        <RequestError
          error={error}
          onRetry={() => {
            setSelected(null);
            setConfirmed(false);
            setPrivateConfirmed(false);
            setError(null);
            void query.reload();
          }}
        />
      )}
      {notice && (
        <p role="status" className={s.notice}>
          {notice}
        </p>
      )}
    </section>
  );
}
