import { useState } from "react";
import { api, apiFetch } from "@/shared/api";
import { ApiError } from "@/shared/errors";
import { useLocale } from "@/i18n/useLocale";
import { useLearningData } from "@/Pages/Learning/useLearningData";
import { RequestError, LoadingState } from "@/Components/RequestState";
import { styles } from "@/Pages/Workspace/shared";

export type SourceAttachment = {
  document_id: number;
  version: number;
  filename: string;
  mime_type: string;
  size_bytes: number;
  content_hash: string;
};
type Source = SourceAttachment & {
  learner_visible: boolean;
  status: string;
  content_url: string;
};
type SourceList = {
  content_revision: number;
  can_edit: boolean;
  items: Source[];
  total: number;
};

function DownloadSource({
  source,
  path,
}: {
  source: SourceAttachment;
  path: string;
}) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function download() {
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch(path);
      if (!response.ok)
        throw new ApiError(
          t("Не удалось скачать источник. Проверьте доступ и повторите."),
          response.status,
          "http",
        );
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = source.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (value) {
      setError(value);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className={styles.secondary}
        disabled={busy}
        onClick={() => void download()}
      >
        {busy ? t("Скачиваем…") : t("Скачать оригинал")}
      </button>
      {error != null && (
        <RequestError error={error} onRetry={() => void download()} />
      )}
    </>
  );
}

export function LearnerSources({
  assignmentId,
  sources,
}: {
  assignmentId: number;
  sources: SourceAttachment[];
}) {
  const { t } = useLocale();
  if (!sources.length) return null;
  return (
    <section
      className={`${styles.page} ${styles.panel}`}
      aria-label={t("Материалы курса")}
    >
      <h2>{t("Материалы курса")}</h2>
      <p className={styles.muted}>
        {t("Оригиналы закреплены за назначенной версией курса.")}
      </p>
      {sources.map((source) => (
        <div key={source.document_id} className={styles.row}>
          <span>
            {source.filename} ·{" "}
            {t("Версия {version}", { version: source.version })} ·{" "}
            {Math.ceil(source.size_bytes / 1024)} KB
          </span>
          <DownloadSource
            source={source}
            path={`/learning/assignments/${assignmentId}/sources/${source.document_id}/content`}
          />
        </div>
      ))}
    </section>
  );
}

export default function SourceReleasePanel({
  courseId,
  onChanged,
}: {
  courseId: number;
  onChanged?: () => void;
}) {
  const { t } = useLocale();
  const [offset, setOffset] = useState(0);
  const { data, error, loading, reload } = useLearningData<SourceList>(
    `/courses/${courseId}/source-release?offset=${offset}&limit=20`,
  );
  const [selected, setSelected] = useState<Source | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  async function save(source: Source, visible: boolean) {
    if (!data) return;
    setBusy(true);
    setSaveError(null);
    try {
      await api.put(
        `/courses/${courseId}/source-release/${source.document_id}`,
        {
          learner_visible: visible,
          confirm_original_safe: visible && confirmed,
          expected_revision: data.content_revision,
          document_version: source.version,
          content_hash: source.content_hash,
        },
      );
      setSelected(null);
      setConfirmed(false);
      reload();
      onChanged?.();
    } catch (value) {
      setSaveError(value);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`${styles.page} ${styles.panel}`}
      aria-label={t("Источники для учеников")}
    >
      <h2>{t("Источники для учеников")}</h2>
      <p className={styles.muted}>
        {t(
          "Загруженные источники закрыты по умолчанию. Разрешайте только проверенные оригиналы без ключей ответов и приватных материалов. Изменения вступят в силу после новой публикации; прежние назначения сохранят свои файлы.",
        )}
      </p>
      {loading && !data && (
        <LoadingState>{t("Загружаем источники…")}</LoadingState>
      )}
      {error != null && <RequestError error={error} onRetry={reload} />}
      {saveError != null && (
        <RequestError
          error={saveError}
          onRetry={() => {
            setSelected(null);
            setConfirmed(false);
            setSaveError(null);
            reload();
          }}
        />
      )}
      {data && !data.total && (
        <p>{t("Загрузите источники в мастере создания курса.")}</p>
      )}
      {data?.items.map((source) => (
        <article key={source.document_id} className={styles.panel}>
          <strong>{source.filename}</strong>
          <p className={styles.muted}>
            {t("Версия {version}", { version: source.version })} ·{" "}
            {Math.ceil(source.size_bytes / 1024)} KB ·{" "}
            {source.learner_visible
              ? t("Включён в следующий выпуск")
              : t("Закрыт для учеников")}
          </p>
          <div className={styles.row}>
            <DownloadSource
              source={source}
              path={source.content_url.replace(/^\/api/, "")}
            />
            {data.can_edit && (
              <button
                type="button"
                className={styles.secondary}
                disabled={busy || source.status !== "indexed"}
                onClick={() => {
                  setSaveError(null);
                  if (source.learner_visible) void save(source, false);
                  else {
                    setSelected(source);
                    setConfirmed(false);
                  }
                }}
              >
                {source.learner_visible
                  ? t("Убрать из следующего выпуска")
                  : t("Разрешить ученикам")}
              </button>
            )}
          </div>
          {source.status !== "indexed" && (
            <p className={styles.muted}>
              {t("Сначала дождитесь успешной обработки источника.")}
            </p>
          )}
          {selected?.document_id === source.document_id && (
            <div
              role="group"
              aria-label={t("Подтверждение доступа к оригиналу")}
            >
              <label>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  disabled={busy}
                />{" "}
                {t(
                  "Я проверил этот оригинал и разрешаю передать его целиком ученикам.",
                )}
              </label>
              <div className={styles.row}>
                <button
                  type="button"
                  className={styles.primary}
                  disabled={!confirmed || busy}
                  onClick={() => void save(source, true)}
                >
                  {t("Подтвердить доступ")}
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() => {
                    setSelected(null);
                    setConfirmed(false);
                  }}
                >
                  {t("Отмена")}
                </button>
              </div>
            </div>
          )}
        </article>
      ))}
      {data && data.total > 20 && (
        <div className={styles.row}>
          <button
            type="button"
            className={styles.secondary}
            disabled={offset === 0 || busy}
            onClick={() => setOffset((value) => Math.max(0, value - 20))}
          >
            {t("Назад")}
          </button>
          <span>
            {offset + 1}–{Math.min(offset + 20, data.total)} / {data.total}
          </span>
          <button
            type="button"
            className={styles.secondary}
            disabled={offset + 20 >= data.total || busy}
            onClick={() => setOffset((value) => value + 20)}
          >
            {t("Далее")}
          </button>
        </div>
      )}
    </section>
  );
}
