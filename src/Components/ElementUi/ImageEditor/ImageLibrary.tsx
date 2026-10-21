import { useLocale } from "@/i18n/useLocale";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, ImagePlus, Check, RefreshCw, Upload, X } from "lucide-react";
import { api } from "@/shared/api";
import { ApiError } from "@/shared/errors";
import { useDurableState } from "@/hooks/useDurableState";
import { useReconnect } from "@/hooks/useReconnect";
import { RequestError, LoadingState } from "@/Components/RequestState";
import { ProtectedImage } from "@/Components/MarkdownContent";
import styles from "./styles.module.css";

type Asset = {
  id: number;
  course_id: number;
  status: string;
  content_url: string | null;
  prompt: string | null;
  error_code: string | null;
  width: number | null;
  height: number | null;
  review_comment: string | null;
  created_at: string;
};
type Page = { items: Asset[]; total: number; offset: number; limit: number };
type Capabilities = {
  image_max_bytes: number;
  image_max_pixels: number;
  image_generation_available: boolean;
  image_library_available?: boolean;
  image_monthly_limit: number;
};
type Draft = {
  prompt: string;
  requestId?: string;
  submittedPrompt?: string;
  imageId?: number;
};
const labels: Record<string, string> = {
  queued: "В очереди",
  generating: "Генерация",
  pending_review: "Ожидает вашей проверки",
  approved: "Утверждено",
  rejected: "Отклонено",
  failed: "Не удалось создать",
};
const errors: Record<string, string> = {
  image_queue_unavailable:
    "Очередь временно недоступна. Можно запустить новую попытку.",
  image_result_unknown:
    "Провайдер не подтвердил результат. Автоматического платного повтора не было.",
  image_generation_failed:
    "Провайдер не смог подготовить изображение. Исходный запрос сохранён.",
};
const terminal = (status: string) =>
  ["approved", "rejected", "pending_review", "failed"].includes(status);

function AssetCard({
  asset,
  onReview,
  onInsert,
}: {
  asset: Asset;
  onReview: (id: number, decision: string, comment: string) => Promise<void>;
  onInsert?: (markdown: string) => void;
}) {
  const { t } = useLocale();
  const [comment, setComment] = useDurableState(`image:${asset.id}:review`, "");
  const [alt, setAlt] = useDurableState(
    `image:${asset.id}:alt`,
    asset.prompt || t("Иллюстрация к уроку"),
  );
  const [busy, setBusy] = useState(false);
  return (
    <article className={styles.asset}>
      <div className={styles.preview}>
        {asset.content_url ? (
          <ProtectedImage src={asset.content_url} alt={alt} />
        ) : (
          <ImagePlus size={42} aria-hidden />
        )}
      </div>
      <div className={styles.assetBody}>
        <span
          className={styles.badge}
          data-approved={asset.status === "approved"}
        >
          {t(labels[asset.status] || asset.status)}
        </span>
        {asset.prompt && <p>{asset.prompt}</p>}
        {asset.width && (
          <small>
            {asset.width} × {asset.height} px · №{asset.id}
          </small>
        )}
        {asset.error_code && (
          <p role="status">
            {t(
              errors[asset.error_code] ||
                "Изображение недоступно. Проверьте настройки сервиса и повторите явно.",
            )}
          </p>
        )}
        {asset.review_comment && (
          <p>
            {t("Результат проверки:")} {asset.review_comment}
          </p>
        )}
        {asset.status === "pending_review" && (
          <>
            <label>
              {t("Комментарий к проверке")}
              <textarea
                value={comment}
                maxLength={2000}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
            </label>
            <p className={styles.help}>
              {t(
                "Проверьте точность, читаемость и отсутствие лишних деталей. Утверждение фиксирует эту версию.",
              )}
            </p>
            <div className={styles.actions}>
              <button
                className={styles.primary}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onReview(asset.id, "approved", comment);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Check size={16} /> {t("Утвердить")}
              </button>
              <button
                className={styles.secondary}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onReview(asset.id, "rejected", comment);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <X size={16} /> {t("Отклонить")}
              </button>
            </div>
          </>
        )}
        {asset.status === "approved" && onInsert && (
          <>
            <label>
              {t("Описание для читателей")}
              <textarea
                value={alt}
                maxLength={500}
                onChange={(e) => setAlt(e.target.value)}
                rows={2}
              />
            </label>
            <button
              className={styles.primary}
              disabled={!alt.trim()}
              onClick={() =>
                onInsert(
                  `![${alt.trim().replace(/[\\[\]]/g, "\\$&")}](${asset.content_url})`,
                )
              }
            >
              {t("Добавить в урок")}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export default function ImageLibrary({
  courseId,
  onInsert,
}: {
  courseId: number | string;
  onInsert?: (markdown: string) => void;
}) {
  const { t } = useLocale();
  const [page, setPage] = useState<Page | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useDurableState<Draft>(
    `images:${courseId}:generation`,
    { prompt: "" },
  );
  const [current, setCurrent] = useState<Asset | null>(null);
  const currentStatus = current?.status;
  const input = useRef<HTMLInputElement>(null);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const seq = ++sequence.current;
    setLoading(true);
    try {
      const [images, limits] = await Promise.all([
        api.get<Page>(`/courses/${courseId}/images?limit=12&offset=${offset}`),
        api.get<Capabilities>("/materials/capabilities"),
      ]);
      if (seq === sequence.current) {
        setPage(images.data);
        setCapabilities(limits.data);
        setError(null);
      }
    } catch (e) {
      if (seq === sequence.current) setError(e);
    } finally {
      if (seq === sequence.current) setLoading(false);
    }
  }, [courseId, offset]);
  const invalidate = useCallback(() => {
    sequence.current++;
  }, []);
  useEffect(() => {
    setPage(null);
    setCurrent(null);
    void load();
    return invalidate;
  }, [load, invalidate]);
  useReconnect(() => {
    void load();
  });
  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (!draft.imageId) return;
      try {
        const { data } = await api.get<Asset>(`/images/${draft.imageId}`);
        if (active) {
          setCurrent(data);
          setPage((old) =>
            old
              ? {
                  ...old,
                  items: old.items.map((item) =>
                    item.id === data.id ? data : item,
                  ),
                }
              : old,
          );
        }
      } catch (e) {
        if (active) setError(e);
      }
    };
    void poll();
    const timer = setInterval(() => {
      if (!currentStatus || !terminal(currentStatus)) void poll();
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [draft.imageId, currentStatus]);
  useEffect(() => {
    if (!page?.items.some((item) => !terminal(item.status))) return;
    const timer = setInterval(() => {
      void load();
    }, 7000);
    return () => clearInterval(timer);
  }, [page, load]);
  const upload = async (file?: File) => {
    if (!file || busy) return;
    if (!capabilities) {
      setNotice(t("Подождите загрузки допустимых размеров файла."));
      return;
    }
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setNotice(t("Выберите PNG или JPEG."));
      return;
    }
    if (file.size > capabilities.image_max_bytes) {
      setNotice(
        t("Файл превышает {v0} МБ.", {
          v0: Math.floor(capabilities.image_max_bytes / 1024 / 1024),
        }),
      );
      return;
    }
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post(`/courses/${courseId}/images`, form);
      setOffset(0);
      await load();
      setNotice(
        t("Изображение сохранено. Проверьте его перед добавлением в урок."),
      );
      if (input.current) input.current.value = "";
    } catch (e) {
      setError(e);
      setNotice(
        t("Сначала обновите библиотеку: файл мог сохраниться до обрыва связи."),
      );
    } finally {
      setBusy(false);
    }
  };
  const generating =
    !!draft.requestId && (!current || !terminal(current.status));
  const generate = async () => {
    if (busy) return;
    const pending = generating
      ? draft
      : {
          ...draft,
          requestId: crypto.randomUUID(),
          submittedPrompt: draft.prompt.trim(),
          imageId: undefined,
        };
    if (!pending.submittedPrompt || pending.submittedPrompt.length < 3) return;
    setDraft(pending);
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      const { data } = await api.post<Asset>(
        `/courses/${courseId}/images/generate`,
        { prompt: pending.submittedPrompt, request_id: pending.requestId },
      );
      setCurrent(data);
      setDraft({ ...pending, imageId: data.id });
      setOffset(0);
      await load();
    } catch (e) {
      setError(e);
      if (
        e instanceof ApiError &&
        [400, 401, 403, 404, 413, 422, 429].includes(e.status)
      ) {
        setDraft({ prompt: pending.prompt });
        setCurrent(null);
        setNotice(t("Запуск отклонён сервером. Описание сохранено."));
      } else
        setNotice(
          t(
            "Запрос сохранён. Проверка запуска повторит тот же ключ и не создаст вторую генерацию.",
          ),
        );
    } finally {
      setBusy(false);
    }
  };
  const review = async (id: number, decision: string, comment: string) => {
    setError(null);
    try {
      await api.post(`/images/${id}/review`, { decision, comment });
      await load();
    } catch (e) {
      setError(e);
    }
  };
  return (
    <section
      className={styles.library}
      aria-label={t("Библиотека иллюстраций")}
    >
      <header className={styles.header}>
        <h2>
          <ImagePlus size={24} /> {t("Изображения")}
        </h2>
        <button
          className={styles.iconButton}
          aria-label={t("Обновить библиотеку")}
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={18} />
        </button>
      </header>
      <div className={styles.content}>
        {!!error && <RequestError error={error} onRetry={() => void load()} />}
        {notice && <p role="status">{notice}</p>}
        <div
          className={styles.drop}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void upload(e.dataTransfer.files[0]);
          }}
        >
          <h3>{t("Перетащите изображение сюда")}</h3>
          <p>
            PNG, JPEG
            {capabilities &&
              t(" · до {v0} МБ", {
                v0: Math.floor(capabilities.image_max_bytes / 1024 / 1024),
              })}
          </p>
          <button
            className={styles.primary}
            disabled={
              busy ||
              !capabilities ||
              capabilities.image_library_available === false
            }
            onClick={() => input.current?.click()}
          >
            <Upload size={20} />
            {busy ? t("Сохраняем…") : t("Выбрать файл")}
          </button>
          <input
            aria-label={t("Загрузить изображение")}
            ref={input}
            type="file"
            accept="image/png,image/jpeg"
            hidden
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </div>
        <div className={styles.divider}>
          <span>{t("или сгенерируйте")}</span>
        </div>
        <label className={styles.prompt}>
          <span className={styles.srOnly}>{t("Описание изображения")}</span>
          <textarea
            value={draft.prompt}
            disabled={generating}
            maxLength={4000}
            onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
            placeholder={t(
              "Опишите иллюстрацию: объекты, подписи, стиль и учебную задачу",
            )}
            rows={3}
          />
          <button
            aria-label={
              generating
                ? t("Проверить запуск генерации")
                : t("Сгенерировать изображение")
            }
            className={styles.send}
            disabled={
              busy ||
              (!capabilities?.image_generation_available && !generating) ||
              draft.prompt.trim().length < 3
            }
            onClick={() => void generate()}
          >
            {generating ? <RefreshCw size={20} /> : <ArrowUp size={20} />}
          </button>
        </label>
        {capabilities && !capabilities.image_generation_available && (
          <p className={styles.help}>
            {t(
              "Генерация не настроена на этой установке. Загрузите готовую иллюстрацию или обратитесь к администратору для подключения сервиса изображений.",
            )}
          </p>
        )}
        {generating && (
          <p role="status">
            {current
              ? t(labels[current.status])
              : t("Проверка результата запроса")}{" "}
            {t("· исходное описание сохранено.")}
          </p>
        )}
        {loading && !page && (
          <LoadingState>{t("Загружаем иллюстрации…")}</LoadingState>
        )}
        {page && !page.items.length && (
          <p className={styles.empty}>
            {t(
              "В этом курсе ещё нет иллюстраций. Загрузите первую и проверьте её перед публикацией.",
            )}
          </p>
        )}
        {page && (
          <>
            <div className={styles.grid}>
              {page.items.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onReview={review}
                  onInsert={onInsert}
                />
              ))}
            </div>
            <div className={styles.pagination}>
              <button
                className={styles.secondary}
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - 12))}
              >
                {t("Назад")}
              </button>
              <span>
                {page.total
                  ? t("{v0}–{v1} из {v2}", {
                      v0: offset + 1,
                      v1: Math.min(offset + 12, page.total),
                      v2: page.total,
                    })
                  : t("0 изображений")}
              </span>
              <button
                className={styles.secondary}
                disabled={offset + 12 >= page.total || loading}
                onClick={() => setOffset(offset + 12)}
              >
                {t("Далее")}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
