import { useLocale, getLocale } from "@/i18n/useLocale";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileUp, LayoutTemplate, Plus, Sparkles } from "lucide-react";
import Menu from "@/Components/Menu/Menu";
import { api } from "@/shared/api";
import { ApiError } from "@/shared/errors";
import { readDraft, writeDraft, clearDraft } from "@/shared/drafts";
import { useDurableState } from "@/hooks/useDurableState";
import { useReconnect } from "@/hooks/useReconnect";
import { RequestError, LoadingState } from "@/Components/RequestState";
import DraftNotice from "@/Components/DraftNotice";
import { templates } from "@/Pages/Workspace/template-data";
import styles from "./wizard.module.css";
import GenerationPreflight, { type Preflight } from "./GenerationPreflight";
import { applySourceSuggestion, type SourceSuggestion, type SuggestedField } from "./sourceSuggestion";

export type GenerationSettings = {
  title: string;
  goal: string;
  target_audience: string | null;
  difficulty: string;
  language: string;
  lesson_count: number;
  module_tests_enabled: boolean;
  final_test_enabled: boolean;
  approved_plan?: string[];
  expected_revision?: number;
};
type SavedSettings = GenerationSettings & { revision: number };
type DocumentItem = {
  id: number;
  original_filename: string;
  status: string;
  size_bytes: number;
  extracted_characters: number;
  chunk_count: number;
  error_message?: string | null;
};
type Run = {
  run_id: number;
  course_id: number;
  status: string;
  progress_percent: number;
  current_stage: string;
  stages: { code: string; title: string; status: string }[];
  status_error?: { message: string; retryable: boolean } | null;
  status_notice?: string | null;
};
type Capabilities = {
  document_formats: string[];
  document_max_bytes: number;
  source_characters_limit: number;
};
type Draft = {
  settings: GenerationSettings;
  document_ids: number[];
  selection_initialized: boolean;
  request_id: string;
  plan_text?: string;
  edited_source_fields?: Partial<Record<SuggestedField, boolean>>;
  source_fill?: Partial<Record<SuggestedField, string>>;
};
function settingsFromServer(data: SavedSettings): GenerationSettings {
  return {
    title: data.title,
    goal: data.goal,
    target_audience: data.target_audience,
    difficulty: data.difficulty,
    language: data.language,
    lesson_count: data.lesson_count,
    module_tests_enabled: data.module_tests_enabled,
    final_test_enabled: data.final_test_enabled,
    approved_plan: data.approved_plan ?? [],
    expected_revision: data.revision,
  };
}
const bytes = (value: number) =>
  `${(value / 1024 / 1024).toLocaleString(getLocale() === "en" ? "en-GB" : "ru-RU", { maximumFractionDigits: 2 })}${getLocale() === "en" ? " MB" : " МБ"}`;
const steps = [
  "Выберите режим",
  "Загрузите документы",
  "Настройка курса",
  "Генерация ИИ",
  "Проверка и публикация",
];
export function WizardSteps({
  step,
  onStep,
}: {
  step: number;
  onStep?: (step: number) => void;
}) {
  const { t } = useLocale();

  return (
    <ol className={styles.steps} aria-label={t("Этапы создания курса")}>
      {steps.map((title, index) => (
        <li
          key={title}
          className={index + 1 <= step ? styles.completed : ""}
          aria-current={index + 1 === step ? "step" : undefined}
        >
          <button
            disabled={!onStep || index + 1 > step}
            onClick={() => onStep?.(index + 1)}
          >
            <span>
              {t("Шаг") + " "}
              {index + 1}
            </span>
            {t(title)}
          </button>
        </li>
      ))}
    </ol>
  );
}

export default function CourseWizard() {
  const { t } = useLocale();

  const [params, setParams] = useSearchParams();
  const template = templates.find((item) => item.id === params.get("template"));
  const courseId = Number(params.get("course")) || null;
  const runId = Number(params.get("run")) || null;
  const step = runId
    ? 4
    : Math.min(
        4,
        Math.max(1, Number(params.get("step")) || (courseId ? 3 : 1)),
      );
  const resource = `generation:${courseId ?? "new"}`;
  const [draft, setDraft] = useDurableState<Draft>(resource, {
    settings: {
      title: template ? t(template.title) : "",
      goal: template ? t(template.goal) : "",
      target_audience: template ? t(template.audience) : "",
      difficulty: "basic",
      language: getLocale(),
      lesson_count: template?.lessons ?? 6,
      module_tests_enabled: true,
      final_test_enabled: true,
      approved_plan: [],
      expected_revision: 0,
    },
    document_ids: [],
    selection_initialized: false,
    request_id: crypto.randomUUID(),
  });
  const { settings } = draft;
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [notice, setNotice] = useState("");
  const [suggestionState, setSuggestionState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const sourceSelection = draft.document_ids.slice().sort((a, b) => a - b).join(",");
  const [dragging, setDragging] = useState(false);
  const [uploadFailures, setUploadFailures] = useState<
    { file: File; message: string }[]
  >([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const edited = useRef(false);
  const initialDraft = useRef({
    resource,
    hadLocal: Boolean(readDraft<Draft>(resource)),
  });
  if (initialDraft.current.resource !== resource) {
    initialDraft.current = {
      resource,
      hadLocal: Boolean(readDraft<Draft>(resource)),
    };
    edited.current = false;
  }
  const [serverSettings, setServerSettings] = useState<SavedSettings | null>(
    null,
  );
  const [settingsLoadedFor, setSettingsLoadedFor] = useState<number | null>(null);
  const creating = useRef<Promise<number> | null>(null);
  useReconnect(() => setVersion((value) => value + 1));
  const go = (next: number) => {
    setError(null);
    setNotice("");
    setParams({ ...Object.fromEntries(params), step: String(next) });
  };
  const change = (patch: Partial<GenerationSettings>) => {
    if (busy) return;
    edited.current = true;
    setPreflight(null);
    setDraft((previous) => ({
      ...previous,
      settings: { ...previous.settings, ...patch },
      edited_source_fields: { ...previous.edited_source_fields, ...(patch.title !== undefined ? { title: true } : {}), ...(patch.goal !== undefined ? { goal: true } : {}) },
      request_id: crypto.randomUUID(),
    }));
  };

  useEffect(() => {
    let active = true;
    api
      .get<Capabilities>("/materials/capabilities")
      .then(({ data }) => {
        if (active) setCapabilities(data);
      })
      .catch((e) => {
        if (active) setError(e);
      });
    return () => {
      active = false;
    };
  }, [version]);
  useEffect(() => {
    if (!courseId || runId) return;
    let active = true;
    api
      .get<SavedSettings>(`/courses/${courseId}/generation-settings`)
      .then(({ data }) => {
        if (!active) return;
        setServerSettings(data);
        setSettingsLoadedFor(courseId);
        if (!edited.current && !initialDraft.current.hadLocal) {
          setDraft((previous) => ({
            ...previous,
            settings: settingsFromServer(data),
            plan_text: data.approved_plan?.join("\n") ?? "",
          }));
          initialDraft.current.hadLocal = true;
        }
      })
      .catch((e) => {
        if (active && e instanceof ApiError && e.status === 404) setSettingsLoadedFor(courseId);
        if (active && !(e instanceof ApiError && e.status === 404)) setError(e);
      });
    return () => {
      active = false;
    };
    // A local edit is authoritative until the user explicitly saves it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, runId, version]);
  useEffect(() => {
    if (!courseId) return;
    let active = true;
    setLoading(true);
    api
      .get<{ items: DocumentItem[]; total: number }>(
        `/courses/${courseId}/documents?limit=20&offset=${offset}`,
      )
      .then(({ data }) => {
        if (!active) return;
        setDocuments(data.items);
        setTotal(data.total);
        setDraft((previous) =>
          previous.selection_initialized
            ? previous
            : {
                ...previous,
                document_ids: data.items
                  .filter((item) => item.status === "ready")
                  .map((item) => item.id),
                selection_initialized: true,
              },
        );
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, offset, version]);
  useEffect(() => {
    if (!courseId || !sourceSelection || runId) { setSuggestionState("idle"); return; }
    if (busy || step > 3) return;
    if (settingsLoadedFor !== courseId) { setSuggestionState("loading"); return; }
    let active = true;
    setSuggestionState("loading");
    api.post<SourceSuggestion>(`/courses/${courseId}/source-suggestion`, {
      document_ids: sourceSelection.split(",").map(Number),
    }).then(({ data }) => {
      if (!active) return;
      setDraft(previous => {
        const next = applySourceSuggestion(previous, data);
        if (next.settings.title !== previous.settings.title || next.settings.goal !== previous.settings.goal) {
          setPreflight(null);
          return { ...next, request_id: crypto.randomUUID() };
        }
        return next;
      });
      edited.current = true;
      setSuggestionState("ready");
    }).catch(() => { if (active) setSuggestionState("error"); });
    return () => { active = false; };
    // The durable setter reads the latest form. Late source responses never overwrite manual edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, sourceSelection, runId, version, settingsLoadedFor, busy, step]);
  useEffect(() => {
    if (!runId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const { data } = await api.get<Run>(`/generation-runs/${runId}`);
        if (!active) return;
        setRun(data);
        setError(null);
        if (["queued", "running"].includes(data.status))
          timer = setTimeout(poll, 2500);
      } catch (e) {
        if (active) setError(e);
      }
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [runId, version]);
  async function ensureCourse() {
    if (courseId) return courseId;
    if (creating.current) return creating.current;
    creating.current = api
      .post<{ id: number }>("/courses/drafts")
      .then(({ data }) => {
        writeDraft(`generation:${data.id}`, draft);
        clearDraft(resource, draft);
        setParams(
          { course: String(data.id), step: String(step === 1 ? 2 : step) },
          { replace: true },
        );
        return data.id;
      })
      .finally(() => {
        creating.current = null;
      });
    return creating.current;
  }
  async function upload(files: File[]) {
    if (!files.length || busy || !capabilities) return;
    setBusy(true);
    setError(null);
    setUploadFailures([]);
    setNotice("");
    const failures: { file: File; message: string }[] = [];
    try {
      const id = await ensureCourse();
      for (const file of files) {
        try {
          const extension = file.name.split(".").pop()?.toLowerCase();
          if (!extension || !capabilities.document_formats.includes(extension))
            throw new Error(
              t("Формат не поддерживается: {v0}", { v0: file.name }),
            );
          if (file.size > capabilities.document_max_bytes)
            throw new Error(
              t("Файл больше {v0}: {v1}", {
                v0: bytes(capabilities.document_max_bytes),
                v1: file.name,
              }),
            );
          setNotice(t("Загружаем и обрабатываем {v0}", { v0: file.name }));
          const body = new FormData();
          body.append("file", file);
          const uploaded = (
            await api.post<DocumentItem>(`/courses/${id}/documents`, body)
          ).data;
          // A failed extraction leaves the uploaded document visible and available for reprocessing.
          setVersion((value) => value + 1);
          await api.post(`/documents/${uploaded.id}/reindex`);
          const current = readDraft<Draft>(`generation:${id}`)?.value ?? draft;
          const updated = {
            ...current,
            selection_initialized: true,
            document_ids: Array.from(
              new Set([...current.document_ids, uploaded.id]),
            ),
          };
          writeDraft(`generation:${id}`, updated);
          if (courseId === id) setDraft(updated);
        } catch (e) {
          failures.push({
            file,
            message:
              e instanceof Error ? e.message : t("Не удалось загрузить файл"),
          });
        }
      }
      setUploadFailures(failures);
      setVersion((value) => value + 1);
      setNotice(
        failures.length
          ? t(
              "Не все файлы обработаны. Успешно загруженные материалы сохранены.",
            )
          : t("Материалы загружены и обработаны."),
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function action(callback: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await callback();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function prepare() {
    await action(async () => {
      const id = await ensureCourse();
      if (draft.plan_text?.trim() && !settings.approved_plan?.length)
        throw new Error(
          t("Подтвердите план уроков или очистите его перед генерацией."),
        );
      try {
        const saved = (
          await api.put<SavedSettings>(`/courses/${id}/generation-settings`, {
            ...settings,
            expected_revision: settings.expected_revision ?? 0,
          })
        ).data;
        const next = settingsFromServer(saved);
        setServerSettings(saved);
        setDraft((previous) => ({ ...previous, settings: next }));
        const { data } = await api.post<Preflight>(
          `/courses/${id}/generation-preflight`,
          { settings: next, document_ids: draft.document_ids },
        );
        setPreflight(data);
        go(4);
      } catch (reason) {
        if (reason instanceof ApiError && reason.status === 409) {
          try {
            setServerSettings(
              (
                await api.get<SavedSettings>(
                  `/courses/${id}/generation-settings`,
                )
              ).data,
            );
          } catch {
            /* Keep the original conflict and local draft. */
          }
        }
        throw reason;
      }
    });
  }
  async function generate() {
    if (!courseId || !preflight?.allowed) return;
    await action(async () => {
      const { data } = await api.post<{ run_id: number }>(
        `/courses/${courseId}/generation-runs`,
        {
          settings,
          document_ids: draft.document_ids,
          request_id: draft.request_id,
        },
      );
      setRun(null);
      setParams(
        { course: String(courseId), run: String(data.run_id) },
        { replace: true },
      );
    });
  }
  async function resume() {
    if (!runId) return;
    await action(async () => {
      const { data } = await api.post<{ run_id: number }>(
        `/generation-runs/${runId}/retry`,
      );
      setRun(null);
      setParams(
        { course: String(courseId), run: String(data.run_id) },
        { replace: true },
      );
      setVersion((value) => value + 1);
    });
  }
  function selectDocument(item: DocumentItem, selected: boolean) {
    setPreflight(null);
    setDraft((previous) => ({
      ...previous,
      selection_initialized: true,
      request_id: crypto.randomUUID(),
      document_ids: selected
        ? Array.from(new Set([...previous.document_ids, item.id]))
        : previous.document_ids.filter((id) => id !== item.id),
    }));
  }

  return (
    <>
      <Menu />
      <main className={styles.page}>
        <h1 className={styles.srOnly}>{t("Создать курс по документам")}</h1>
        <WizardSteps step={step} onStep={runId || busy ? undefined : go} />
        <div className={styles.content}>
          {!!error && (
            <RequestError
              error={error}
              onRetry={() => {
                setError(null);
                setVersion((value) => value + 1);
              }}
            />
          )}
          {notice && <p role="status">{notice}</p>}
          {step === 1 && !runId && (
            <section>
              <h2>{t("Как вы хотите создать курс?")}</h2>
              <div className={styles.modes}>
                <button onClick={() => go(2)}>
                  <FileUp className={styles.modeIcon} aria-hidden="true" />
                  <h3>{t("Из документов")}</h3>
                  <p>
                    {t(
                      "Загрузите источники. ИИ подготовит структуру, уроки и задания для вашей проверки.",
                    )}
                  </p>
                </button>
                <Link to="/templates">
                  <LayoutTemplate className={styles.modeIcon} aria-hidden="true" />
                  <h3>{t("По сценарию")}</h3>
                  <p>
                    {t(
                      "Выберите цель обучения и дополните её своими материалами.",
                    )}
                  </p>
                </Link>
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      const id = await ensureCourse();
                      setParams(
                        { course: String(id), step: "2" },
                        { replace: true },
                      );
                      window.location.assign(`/courses/${id}/edit`);
                    })
                  }
                >
                  <Plus className={styles.modeIcon} aria-hidden="true" />
                  <h3>{t("Вручную")}</h3>
                  <p>
                    {t(
                      "Создайте модули и уроки в редакторе. ИИ не расходуется.",
                    )}
                  </p>
                </button>
              </div>
            </section>
          )}
          {step === 2 && !runId && (
            <section>
              <div
                className={`${styles.uploadCard} ${dragging ? styles.dragging : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  void upload(Array.from(event.dataTransfer.files));
                }}
              >
                <h2>
                  {t("Перетащите") + " "}
                  {capabilities?.document_formats
                    .map((value) => value.toUpperCase())
                    .join(", ") ?? t("документы")}
                </h2>
                <p>
                  {t(
                    "или выберите файлы вручную — Лерниум извлечёт знания из документов",
                  )}
                </p>
                {capabilities ? (
                  <>
                    <label className={styles.primary}>
                      {t("▱ Выбрать файлы")}
                      <input
                        ref={fileInput}
                        type="file"
                        multiple
                        disabled={busy}
                        accept={capabilities.document_formats
                          .map((value) => "." + value)
                          .join(",")}
                        onChange={(event) =>
                          void upload(Array.from(event.target.files ?? []))
                        }
                      />
                    </label>
                    <small>
                      {t("До") + " "}
                      {bytes(capabilities.document_max_bytes)}
                      {" " + t("на файл · до") + " "}
                      {capabilities.source_characters_limit.toLocaleString(
                        getLocale() === "en" ? "en-GB" : "ru-RU",
                      )}
                      {" " + t("символов в источниках курса")}
                    </small>
                  </>
                ) : (
                  !error && (
                    <LoadingState>
                      {t("Загружаем доступные форматы и лимиты…")}
                    </LoadingState>
                  )
                )}
              </div>
              {uploadFailures.length > 0 && (
                <div className="request-state" role="alert">
                  <h3>{t("Файлы, требующие внимания")}</h3>
                  {uploadFailures.map((failure, index) => (
                    <p key={index}>
                      {failure.file.name}: {failure.message}
                    </p>
                  ))}
                  <button
                    disabled={busy}
                    onClick={() =>
                      void upload(uploadFailures.map((item) => item.file))
                    }
                  >
                    {t("Повторить загрузку этих файлов")}
                  </button>
                </div>
              )}
              {loading && (
                <LoadingState>{t("Загружаем список источников…")}</LoadingState>
              )}
              {!loading && documents.length > 0 && (
                <>
                  <p>
                    {t("Выбрано для генерации:") + " "}
                    {draft.document_ids.length}
                    {" " + t("· Всего источников:") + " "}
                    {total}
                  </p>
                  <ul className={styles.documents}>
                    {documents.map((item) => (
                      <li key={item.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={draft.document_ids.includes(item.id)}
                            disabled={busy || item.status !== "ready"}
                            onChange={(event) =>
                              selectDocument(item, event.target.checked)
                            }
                          />
                          <strong>{item.original_filename}</strong>
                        </label>
                        <p>
                          {bytes(item.size_bytes)} ·{" "}
                          {item.extracted_characters.toLocaleString(
                            getLocale() === "en" ? "en-GB" : "ru-RU",
                          )}
                          {" " + t("символов ·") + " "}
                          {item.chunk_count}
                          {" " + t("фрагментов")}
                        </p>
                        <span>
                          {item.status === "ready"
                            ? t("Готов к генерации")
                            : item.status === "error"
                              ? t("Ошибка обработки")
                              : t("Ожидает обработки")}
                        </span>
                        {item.error_message && (
                          <p role="alert">{item.error_message}</p>
                        )}
                        <div className={styles.actions}>
                          <button
                            disabled={busy}
                            onClick={() =>
                              void action(async () => {
                                await api.post(`/documents/${item.id}/reindex`);
                                setVersion((value) => value + 1);
                              })
                            }
                          >
                            {item.status === "ready"
                              ? t("Обработать заново")
                              : t("Обработать")}
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  t(
                                    "Убрать источник «{v0}» из черновика? Опубликованные материалы и результаты сохранятся.",
                                    { v0: item.original_filename },
                                  ),
                                )
                              )
                                void action(async () => {
                                  await api.delete(`/documents/${item.id}`);
                                  selectDocument(item, false);
                                  setVersion((value) => value + 1);
                                });
                            }}
                          >
                            {t("Убрать источник")}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.actions}>
                    <button
                      disabled={offset === 0 || busy}
                      onClick={() =>
                        setOffset((value) => Math.max(0, value - 20))
                      }
                    >
                      {t("Предыдущие")}
                    </button>
                    <span>
                      {offset + 1}–{Math.min(offset + 20, total)}
                      {" " + t("из") + " "}
                      {total}
                    </span>
                    <button
                      disabled={offset + 20 >= total || busy}
                      onClick={() => setOffset((value) => value + 20)}
                    >
                      {t("Следующие")}
                    </button>
                  </div>
                </>
              )}
              <div className={styles.footer}>
                <button onClick={() => go(1)}>{t("← Назад")}</button>
                <button
                  className={styles.primary}
                  disabled={busy || !draft.document_ids.length}
                  onClick={() => go(3)}
                >
                  {t("Далее →")}
                </button>
              </div>
            </section>
          )}
          {step === 3 && !runId && (
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void prepare();
              }}
            >
              <fieldset
                disabled={busy}
                className={styles.formFields}
              >
                <legend className={styles.srOnly}>
                  {t("Настройки курса")}
                </legend>
                <DraftNotice />
                {serverSettings &&
                  settings.expected_revision !== serverSettings.revision && (
                    <section className="request-state">
                      <h3>{t("Настройки на сервере изменились")}</h3>
                      <p>
                        {t(
                          "Ваши параметры сохранены отдельно. Сравните их перед записью.",
                        )}
                      </p>
                      <details>
                        <summary>{t("Показать серверные параметры")}</summary>
                        <p>
                          {serverSettings.title} · {serverSettings.goal}
                        </p>
                        <p>
                          {serverSettings.target_audience} ·{" "}
                          {serverSettings.language} ·{" "}
                          {serverSettings.difficulty} ·{" "}
                          {serverSettings.lesson_count}
                          {" " + t("уроков")}
                        </p>
                        <p>
                          {t("Тесты модулей:") + " "}
                          {serverSettings.module_tests_enabled
                            ? t("да")
                            : t("нет")}
                          {" " + t("· Итоговый тест:") + " "}
                          {serverSettings.final_test_enabled
                            ? t("да")
                            : t("нет")}
                        </p>
                        <ol>
                          {serverSettings.approved_plan?.map((title, index) => (
                            <li key={index}>{title}</li>
                          ))}
                        </ol>
                      </details>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          change({ expected_revision: serverSettings.revision })
                        }
                      >
                        {t("Продолжить с моими параметрами вместо этой версии")}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setDraft((previous) => ({
                            ...previous,
                            settings: settingsFromServer(serverSettings),
                            plan_text:
                              serverSettings.approved_plan?.join("\n") ?? "",
                            request_id: crypto.randomUUID(),
                          }));
                          setPreflight(null);
                        }}
                      >
                        {t("Взять параметры сервера")}
                      </button>
                    </section>
                  )}
                {draft.document_ids.length > 0 && <aside className={styles.sourceFillNotice} aria-live="polite">
                  <Sparkles size={20} aria-hidden="true" />
                  <div><strong>{t("Поможем заполнить по документам")}</strong>
                    <p>{suggestionState === "loading" ? t("Подбираем тему и описание из выбранных источников…") : suggestionState === "error" ? t("Не удалось прочитать подсказки. Заполните поля сами или повторите попытку — ваши правки сохранятся.") : t("Тема и описание взяты из текста документов. Проверьте и отредактируйте их под свою задачу. Ручные правки не заменяются.")}</p>
                    {suggestionState === "error" && <button type="button" onClick={() => setVersion(value => value + 1)}>{t("Повторить автозаполнение")}</button>}
                  </div>
                </aside>}
                <label>
                  {t("Название курса")}
                  <input
                    required
                    maxLength={200}
                    value={settings.title}
                    onChange={(event) => change({ title: event.target.value })}
                  />
                </label>
                <label>
                  {t("Описание и цель курса")}
                  <textarea
                    required
                    maxLength={2000}
                    rows={3}
                    value={settings.goal}
                    onChange={(event) => change({ goal: event.target.value })}
                  />
                </label>
                <label>
                  {t("Для кого курс")}
                  <input
                    maxLength={1000}
                    value={settings.target_audience ?? ""}
                    onChange={(event) =>
                      change({ target_audience: event.target.value || null })
                    }
                  />
                </label>
                <fieldset>
                  <legend>{t("Сложность курса")}</legend>
                  <div className={styles.difficulty}>
                    {[
                      ["basic", t("Базовый"), t("Минимальный уровень")],
                      ["intermediate", t("Средний"), t("Есть опыт")],
                      ["advanced", t("Продвинутый"), t("Эксперт")],
                    ].map(([value, title, description]) => (
                      <label
                        key={value}
                        className={
                          settings.difficulty === value ? styles.chosen : ""
                        }
                      >
                        <input
                          type="radio"
                          name="difficulty"
                          value={value}
                          checked={settings.difficulty === value}
                          onChange={() => change({ difficulty: value })}
                        />
                        <strong>{title}</strong>
                        <small>{description}</small>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className={styles.split}>
                  <label>
                    {t("Язык курса")}
                    <select
                      value={settings.language}
                      onChange={(event) =>
                        change({ language: event.target.value })
                      }
                    >
                      <option value="ru">{t("Русский")}</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                  <label>
                    {t("Количество уроков в курсе")}
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={settings.lesson_count}
                      onChange={(event) =>
                        change({
                          lesson_count: Number(event.target.value),
                          approved_plan: [],
                        })
                      }
                    />
                  </label>
                </div>
                <fieldset>
                  <legend>{t("План уроков")}</legend>
                  <p>
                    {t("Можно подготовить план с") + " "}
                    <Link to={`/ai-helper?course=${courseId ?? ""}`}>
                      {t("ИИ-помощником по источникам курса")}
                    </Link>
                    {" " +
                      t(
                        "и отредактировать его здесь. Если оставить поле пустым, ИИ предложит структуру во время генерации.",
                      )}
                  </p>
                  <label>
                    {t("Названия уроков — каждое на отдельной строке")}
                    <textarea
                      rows={6}
                      value={
                        draft.plan_text ??
                        settings.approved_plan?.join("\n") ??
                        ""
                      }
                      onChange={(event) => {
                        if (busy) return;
                        edited.current = true;
                        setPreflight(null);
                        setDraft((previous) => ({
                          ...previous,
                          plan_text: event.target.value,
                          settings: { ...previous.settings, approved_plan: [] },
                          request_id: crypto.randomUUID(),
                        }));
                      }}
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.approved_plan?.length)}
                      disabled={!(draft.plan_text ?? "").trim() || busy}
                      onChange={(event) => {
                        const titles = (draft.plan_text ?? "")
                          .split("\n")
                          .map((value) => value.trim())
                          .filter(Boolean);
                        if (
                          event.target.checked &&
                          (titles.length !== settings.lesson_count ||
                            titles.some((title) => title.length > 200))
                        ) {
                          setError(
                            new Error(
                              t(
                                "План должен содержать {v0} названий длиной до 200 символов.",
                                { v0: settings.lesson_count },
                              ),
                            ),
                          );
                          return;
                        }
                        setError(null);
                        change({
                          approved_plan: event.target.checked ? titles : [],
                        });
                      }}
                    />
                    {t(
                      "Подтверждаю план: использовать эти уроки при генерации",
                    )}
                  </label>
                </fieldset>
                <div className={styles.split}>
                  <label className={styles.toggle}>
                    {t("Тесты после каждого модуля")}
                    <input
                      type="checkbox"
                      role="switch"
                      checked={settings.module_tests_enabled}
                      onChange={(event) =>
                        change({ module_tests_enabled: event.target.checked })
                      }
                    />
                  </label>
                  <label className={styles.toggle}>
                    {t("Финальный тест")}
                    <input
                      type="checkbox"
                      role="switch"
                      checked={settings.final_test_enabled}
                      onChange={(event) =>
                        change({ final_test_enabled: event.target.checked })
                      }
                    />
                  </label>
                </div>
                <div className={styles.footer}>
                  <button type="button" onClick={() => go(2)}>
                    {t("← Назад к источникам")}
                  </button>
                  <button
                    className={styles.primary}
                    disabled={busy || !draft.document_ids.length}
                  >
                    {busy ? t("Проверяем…") : t("Сохранить и продолжить →")}
                  </button>
                </div>
                {!draft.document_ids.length && (
                  <p>
                    {t("Выберите обработанные источники на предыдущем шаге.")}
                  </p>
                )}
              </fieldset>
            </form>
          )}
          {step === 4 && !runId && (
            <GenerationPreflight settings={settings} preflight={preflight} sourceCount={draft.document_ids.length}
              busy={busy} onPrepare={() => void prepare()} onGenerate={() => void generate()} onBack={() => go(3)} />
          )}
          {runId && (
            <section className={styles.panel} aria-live="polite">
              <h2>
                {["completed", "succeeded"].includes(run?.status ?? "")
                  ? t("Курс готов к проверке")
                  : run?.status === "paused"
                    ? t("Прогресс сохранён")
                    : run?.status === "failed"
                      ? t("Генерация остановлена")
                      : t("Генерация курса")}
              </h2>
              {!run && !error ? (
                <LoadingState>{t("Получаем состояние запуска…")}</LoadingState>
              ) : (
                run && (
                  <>
                    <progress value={run.progress_percent} max={100} />
                    <strong className={styles.percent}>
                      {run.progress_percent}%
                    </strong>
                    <ol className={styles.stages}>
                      {run.stages.map((stage) => (
                        <li key={stage.code}>
                          <span>
                            {stage.status === "completed"
                              ? "✓"
                              : stage.status === "running"
                                ? "◌"
                                : "○"}
                          </span>
                          {t(stage.title)}
                          <small>
                            {stage.status === "completed"
                              ? t("Готово")
                              : stage.status === "running"
                                ? t("В работе")
                                : stage.status === "failed"
                                  ? t("Ошибка")
                                  : t("Ожидание")}
                          </small>
                        </li>
                      ))}
                    </ol>
                    {run.status_error && (
                      <p role="alert">{run.status_error.message}</p>
                    )}
                    {run.status_notice && (
                      <p role="status">{t(run.status_notice)}</p>
                    )}
                    {run.status === "paused" && (
                      <button
                        className={styles.primary}
                        disabled={busy}
                        onClick={() => void resume()}
                      >
                        {t("Продолжить генерацию")}
                      </button>
                    )}
                    {run.status === "failed" && run.status_error?.retryable && (
                      <button disabled={busy} onClick={() => void resume()}>
                        {t("Повторить генерацию")}
                      </button>
                    )}
                    {["queued", "running"].includes(run.status) && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void action(async () => {
                            await api.post(`/generation-runs/${runId}/cancel`);
                            setVersion((value) => value + 1);
                          })
                        }
                      >
                        {t("Остановить после текущего этапа")}
                      </button>
                    )}
                    {["completed", "succeeded"].includes(run.status) && (
                      <Link
                        className={styles.primary}
                        to={`/courses/${courseId}/edit`}
                      >
                        {t("Проверить и опубликовать курс")}
                      </Link>
                    )}
                    {run.status === "failed" && (
                      <button
                        onClick={() => {
                          setRun(null);
                          setParams(
                            { course: String(courseId), step: "3" },
                            { replace: true },
                          );
                        }}
                      >
                        {t("Изменить параметры курса")}
                      </button>
                    )}
                    <p>
                      {t(
                        "Материалы и завершённые этапы сохраняются на сервере. К запуску можно вернуться по этому адресу или из дашборда.",
                      )}
                    </p>
                  </>
                )
              )}
            </section>
          )}
        </div>
      </main>
    </>
  );
}
