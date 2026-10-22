import { useLocale } from "@/i18n/useLocale";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MarkdownContent from "@/Components/MarkdownContent";
import TextEditor, { type TextEditorHandle } from "@/Components/ElementUi/TextEditor/TextEditor";
import EntityEditor, { type EditableEntity } from "./EntityEditor";
import AssessmentEditor, { type AssessmentTarget } from "./AssessmentEditor";
import ImageLibrary from "@/Components/ElementUi/ImageEditor/ImageLibrary";
import DiagramEditor from "@/Components/DiagramEditor";
import { api, authSessionIsCurrent, captureAuthSession } from "@/shared/api";
import Menu from "@/Components/Menu/Menu";
import styles from "./courseEditPage.module.css";
import { useAuth } from "@/auth/useAuth";
import {
  readDraft,
  writeDraft,
  clearDraft,
  draftStorageError,
} from "@/shared/drafts";
import { ApiError } from "@/shared/errors";
import { RequestError, LoadingState } from "@/Components/RequestState";
import DraftNotice from "@/Components/DraftNotice";
import { useReconnect } from "@/hooks/useReconnect";
import { PublicationHistory } from "@/Pages/Learning/CourseReviewsPage";
import CourseTransferPanel from "@/Pages/TeamLearning/CourseTransferPanel";
import SourceReleasePanel from "@/Components/SourceReleasePanel";

type Lesson = {
  id: number;
  title: string;
  description: string;
  content: string;
  revision: number;
};
type ReviewTest = {
  id: number;
  question: string;
  answers: string[];
  correct_answer: string;
  revision: number;
};
type Module = {
  id: number;
  title: string;
  description?: string;
  revision: number;
  lessons: Lesson[];
  tests: ReviewTest[];
  tasks: { id: number; name: string; description: string; revision: number }[];
};
type Structure = {
  course_id: number;
  title: string;
  description?: string;
  content_revision: number;
  status: string;
  modules_timeline: { module_id: number }[];
};
type Publication = {
  id: number;
  publication_status: "published";
  revision: number;
  published_at: string;
};

export default function CourseEditPage() {
  const { t } = useLocale();
  const { id } = useParams();
  const { user } = useAuth();
  const owner = user?.id ?? null;
  const [structure, setStructure] = useState<Structure | null>(null);
  const courseTitle = structure?.title?.trim() || `${t("Курс")} ${id}`;
  const [modules, setModules] = useState<Module[]>([]);
  const [finalTests, setFinalTests] = useState<ReviewTest[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  const [publicationRefresh, setPublicationRefresh] = useState(0);
  const [baseRevision, setBaseRevision] = useState<number>();
  const [restored, setRestored] = useState(false);
  const [serverLesson, setServerLesson] = useState<Lesson | null>(null);
  const selectedRef = useRef<number | null>(null);
  const latestEditor = useRef({ courseId: id, owner, selected, draft, baseRevision });
  latestEditor.current = { courseId: id, owner, selected, draft, baseRevision };
  useReconnect(() => setVersion((v) => v + 1));
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditableEntity | null>(null);
  const [assessment, setAssessment] = useState<AssessmentTarget | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const pendingPublication = useRef<{ cancelled: boolean } | null>(null);
  const pendingSave = useRef<{ cancelled: boolean } | null>(null);
  const [publicationProblems, setPublicationProblems] = useState<
    { id: string; question: string; message: string }[]
  >([]);
  const textInput = useRef<TextEditorHandle>(null);
  const lesson = modules
    .flatMap((m) => m.lessons)
    .find((l) => l.id === selected);
  const dirty = Boolean(lesson && draft !== lesson.content);
  const pendingLessons = modules
    .flatMap((m) => m.lessons)
    .filter((item) => {
      const local =
        item.id === selected
          ? draft
          : readDraft<string>(`lesson:${item.id}`, owner)?.value;
      return typeof local === "string" && local !== item.content;
    });

  useEffect(() => {
    if (pendingSave.current) {
      pendingSave.current = null;
      setBusy(false);
    }
    // A new course or a refreshed session owns its own publication state.
    if (pendingPublication.current) {
      pendingPublication.current = null;
      setBusy(false);
    }
    return () => {
      if (pendingPublication.current) pendingPublication.current.cancelled = true;
      if (pendingSave.current) pendingSave.current.cancelled = true;
    };
  }, [id, owner, version]);

  useEffect(() => {
    let stopped = false;
    setLoading(true);
    setError(null);
    setNotice("");
    (async () => {
      try {
        const { data } = await api.get<Structure>(`/courses/${id}/structure`);
        const details = await Promise.all(
          data.modules_timeline.map((m) =>
            api.get<Module>(`/modules/${m.module_id}`),
          ),
        );
        const finals = await api.get<ReviewTest[]>(`/courses/${id}/tests/`);
        if (!stopped) {
          const loaded = details.map((r) => r.data);
          const lessons = loaded.flatMap((m) => m.lessons);
          const first =
            lessons.find((l) => l.id === selectedRef.current) ?? lessons[0];
          setFinalTests(finals.data);
          setStructure(data);
          setModules(loaded);
          const recovery = first
            ? readDraft<string>(`lesson:${first.id}`, owner)
            : null;
          const recovered = Boolean(
            recovery &&
            typeof recovery.value === "string" &&
            recovery.value !== first?.content,
          );
          setSelected(first?.id ?? null);
          selectedRef.current = first?.id ?? null;
          setDraft(recovered ? recovery!.value : (first?.content ?? ""));
          setBaseRevision(
            recovered
              ? (recovery!.baseRevision ?? first?.revision)
              : first?.revision,
          );
          setRestored(recovered);
          setServerLesson(
            recovered && recovery?.baseRevision !== first?.revision
              ? first
              : null,
          );
        }
      } catch (e) {
        if (!stopped) setError(e);
      } finally {
        if (!stopped) setLoading(false);
      }
    })();
    return () => {
      stopped = true;
    };
  }, [id, version, owner]);

  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  function select(item: Lesson) {
    if (dirty && draftStorageError()) {
      setError(
        new ApiError(
          t(
            "Сначала сохраните урок или скачайте черновики: браузер не смог записать локальную копию.",
          ),
          0,
          "storage",
        ),
      );
      return;
    }
    const recovery = readDraft<string>(`lesson:${item.id}`, owner);
    const recovered = Boolean(
      recovery &&
      typeof recovery.value === "string" &&
      recovery.value !== item.content,
    );
    setSelected(item.id);
    selectedRef.current = item.id;
    setDraft(recovered ? recovery!.value : item.content);
    setBaseRevision(
      recovered ? (recovery!.baseRevision ?? item.revision) : item.revision,
    );
    setRestored(recovered);
    setServerLesson(
      recovered && recovery?.baseRevision !== item.revision ? item : null,
    );
    setNotice("");
    setError(null);
  }
  function edit(value: string) {
    if (!lesson) return;
    writeDraft(`lesson:${lesson.id}`, value, baseRevision, owner);
    latestEditor.current = { ...latestEditor.current, draft: value };
    setDraft(value);
  }
  async function save(expected = baseRevision) {
    if (!lesson || busy || pendingSave.current) return;
    const request = { cancelled: false };
    pendingSave.current = request;
    const session = captureAuthSession();
    const saved = { courseId: id, owner, lessonId: lesson.id, content: latestEditor.current.draft };
    const current = () => pendingSave.current === request && !request.cancelled
      && latestEditor.current.courseId === saved.courseId && latestEditor.current.owner === saved.owner
      && latestEditor.current.selected === saved.lessonId && authSessionIsCurrent(session);
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      const { data } = await api.put<Lesson>(`/lessons/${lesson.id}`, {
        content: saved.content,
        expected_revision: expected ?? lesson.revision,
      });
      if (!current()) return;
      setModules((prev) =>
        prev.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) =>
            l.id === saved.lessonId ? { ...l, ...data, content: saved.content } : l,
          ),
        })),
      );
      setStructure((s) => (s ? { ...s, status: "draft" } : s));
      const unchanged = latestEditor.current.draft === saved.content;
      setNotice(unchanged ? t("Урок сохранён") : "");
      if (unchanged) clearDraft(`lesson:${saved.lessonId}`, saved.content, saved.owner);
      else writeDraft(`lesson:${saved.lessonId}`, latestEditor.current.draft, data.revision, saved.owner);
      latestEditor.current = { ...latestEditor.current, baseRevision: data.revision };
      setBaseRevision(data.revision);
      setRestored(false);
      setServerLesson(null);
    } catch (e) {
      if (!current()) return;
      setError(e);
      if (e instanceof ApiError && e.status === 409) {
        try {
          const { data } = await api.get<Lesson>(`/lessons/${saved.lessonId}`);
          if (current()) setServerLesson(data);
        } catch {
          /* Original draft and conflict remain visible. */
        }
      }
    } finally {
      if (current()) {
        pendingSave.current = null;
        setBusy(false);
      }
    }
  }
  async function publish() {
    if (busy || pendingPublication.current) return;
    if (pendingLessons.length) {
      setError(new Error(t("Сначала сохраните все изменённые уроки.")));
      return;
    }
    const request = { cancelled: false };
    pendingPublication.current = request;
    const session = captureAuthSession();
    const current = () => pendingPublication.current === request && !request.cancelled
      && latestEditor.current.courseId === id && latestEditor.current.owner === owner
      && authSessionIsCurrent(session);
    setBusy(true);
    setError(null);
    setNotice("");
    setPublicationProblems([]);
    try {
      const { data } = await api.post<Publication>(`/courses/${id}/publish`);
      if (!current()) return;
      setNotice(t("Курс опубликован"));
      setStructure((s) => (s ? {
        ...s,
        status: data.publication_status,
        content_revision: data.revision,
      } : s));
      // The closed export panel is already mounted. Invalidate its version list
      // without reloading the lesson editor or losing text typed during publish.
      setPublicationRefresh((value) => value + 1);
    } catch (e) {
      if (!current()) return;
      setError(e);
      if (
        e instanceof ApiError &&
        e.data &&
        typeof e.data === "object" &&
        "detail" in e.data
      ) {
        const detail = e.data.detail;
        if (
          detail &&
          typeof detail === "object" &&
          "assessments" in detail &&
          Array.isArray(detail.assessments)
        )
          setPublicationProblems(detail.assessments);
      }
    } finally {
      if (current()) {
        pendingPublication.current = null;
        setBusy(false);
      }
    }
  }
  async function modify(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      await action();
      setVersion((value) => value + 1);
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  }
  function move<T extends { id: number; revision: number }>(
    items: T[],
    index: number,
    direction: number,
    path: string,
  ) {
    const next = [...items];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    void modify(() =>
      api.put(path, {
        items: next.map((item, position) => ({
          id: item.id,
          position,
          expected_revision: item.revision,
        })),
      }),
    );
  }
  function insertMarkdown(value: string) {
    const input = textInput.current;
    const current = latestEditor.current;
    // A delayed renderer must never write a previous lesson's text into the
    // current editor. Within the same lesson, keep typing made while it ran.
    if (!input || current.courseId !== id || current.owner !== owner ||
        current.selected !== lesson?.id || selectedRef.current !== lesson?.id) return false;
    return input.insertMarkdown(value);
  }

  function editTest(test: ReviewTest, parentId?: number) {
    setEditing({
      kind: "test",
      courseId: Number(id),
      id: test.id,
      parentId,
      revision: test.revision,
      title: test.question,
      answers: test.answers,
      correct_answer: test.correct_answer,
    });
  }
  function removeEntity(
    kind: "modules" | "lessons" | "tests" | "tasks",
    entity: { id: number; revision: number },
    label: string,
  ) {
    if (
      !window.confirm(
        t(
          "Убрать «{v0}» из черновика? Опубликованные версии и результаты участников сохранятся.",
          { v0: label },
        ),
      )
    )
      return;
    void modify(() =>
      api.delete(`/${kind}/${entity.id}?expected_revision=${entity.revision}`),
    );
  }
  function download() {
    const text =
      `# ${courseTitle}\n\n` +
      modules
        .map(
          (m) =>
            `## ${m.title}\n\n` +
            m.lessons
              .map(
                (l) =>
                  `### ${l.title}\n\n${l.id === selected ? draft : (readDraft<string>(`lesson:${l.id}`, owner)?.value ?? l.content)}`,
              )
              .join("\n\n"),
        )
        .join("\n\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/markdown;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "course.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  if (error && !structure)
    return (
      <>
        <Menu />
        <RequestError
          error={error}
          fullPage
          onRetry={() => setVersion((v) => v + 1)}
          retrying={loading}
        />
      </>
    );
  return (
    <>
      <Menu />
      <main className={styles.container}>
        <p className={styles.breadcrumbs}>
          <Link to="/courses">← {t("Мои курсы")}</Link>
        </p>
        <header className={styles.courseHeader}>
          <div className={styles.courseIdentity}>
            <div className={styles.courseEyebrow}><span>LERNIUM</span> / {t("Редактор курса")}</div>
            <h1>{courseTitle}</h1>
          </div>
          {structure && <div className={styles.courseActions}>
            <button
              disabled={busy}
              onClick={() =>
                setEditing({
                  kind: "course",
                  courseId: Number(id),
                  id: Number(id),
                  revision: structure.content_revision,
                  title: structure.title,
                  description: structure.description,
                })
              }
            >
              {t("Настройки курса")}
            </button>
            <Link className={styles.canvasLink} to={`/courses/${id}/canvas`}>{t("Открыть канву")} ↗</Link>
          </div>}
        </header>
        {structure && <details className={styles.courseMeta}>
          <summary>{t("Структура, источники и согласование")}</summary>
          <div className={styles.courseMetaBody}>
          <div className={styles.toolbar}>
            <button
              disabled={busy}
              onClick={() =>
                setEditing({ kind: "module", courseId: Number(id), title: "" })
              }
            >
              {t("Добавить модуль +")}
            </button>
            <button
              disabled={busy}
              onClick={() =>
                setEditing({ kind: "test", courseId: Number(id), title: "" })
              }
            >
              {t("Добавить итоговый вопрос")}
            </button>
          </div>
          {user?.organization_id && <>
            <p><Link to={`/course-reviews?course=${id}`}>{t("Ссылка для назначенного проверяющего")}</Link></p>
            <details className={styles.reviewHistory}>
              <summary>{t("История согласования курса")}</summary>
              <PublicationHistory key={version} courseId={Number(id)} />
            </details>
          </>}
          <SourceReleasePanel courseId={Number(id)} onChanged={() => setVersion(v => v + 1)} />
          </div>
        </details>}
        {loading && (
          <LoadingState>{t("Загружаем содержание курса…")}</LoadingState>
        )}
        {Boolean(error) && (
          <RequestError
            error={error}
            onRetry={() => setVersion((v) => v + 1)}
            retrying={loading}
          />
        )}
        {notice && <p role="status">{notice}</p>}
        {publicationProblems.length > 0 && (
          <section className="request-state">
            <h2>{t("Задания, требующие настройки")}</h2>
            <ul>
              {publicationProblems.map((problem) => (
                <li key={problem.id}>
                  <strong>{problem.question}</strong>
                  <p>{t(problem.message)}</p>
                  <button
                    onClick={() => {
                      const [kind, key] = problem.id.split(":");
                      const found = [
                        ...finalTests,
                        ...modules.flatMap((module) => module.tests),
                      ].find((item) => item.id === Number(key));
                      setAssessment({
                        kind: kind === "task" ? "task" : "test",
                        id: Number(key),
                        title: problem.question,
                        answers: kind === "test" ? (found?.answers ?? []) : [],
                      });
                    }}
                  >
                    {t("Настроить оценивание")}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {dirty && <DraftNotice restored={restored} />}
        {pendingLessons.length > 0 && (
          <div className={styles.pending} role="status">
            {t("Несохранённых уроков:")} {pendingLessons.length}.{" "}
            {pendingLessons.map((item) => (
              <button
                key={item.id}
                disabled={busy}
                onClick={() => select(item)}
              >
                {item.title}
              </button>
            ))}
          </div>
        )}
        {!loading && !modules.some((m) => m.lessons.length) && (
          <section className="request-state">
            <h2>{t("В курсе пока нет уроков")}</h2>
            <p>
              {t(
                "Добавьте модуль и уроки вручную или подготовьте содержание из документов.",
              )}
            </p>
            <Link to={`/express?course=${id}&step=2`}>
              {t("Создать из документов")}
            </Link>
          </section>
        )}
        <div className={styles.content}>
          <section className={styles.editorContainer}>
            {lesson ? (
              <>
                <header className={styles.lessonHeading}>
                  <h2>{lesson.title}</h2>
                <div className={styles.toolbar}>
                  <button
                    disabled={busy}
                    onClick={() =>
                      setEditing({
                        kind: "lesson",
                        courseId: Number(id),
                        id: lesson.id,
                        revision: baseRevision,
                        title: lesson.title,
                        description: lesson.description,
                        content: draft,
                      })
                    }
                  >
                    {t("Название и описание")}
                  </button>
                  <button
                    disabled={busy}
                    className={styles.danger}
                    onClick={() =>
                      removeEntity("lessons", lesson, lesson.title)
                    }
                  >
                    {t("Убрать урок")}
                  </button>
                </div>
                </header>
                <TextEditor
                  key={`${id}:${lesson.id}:${owner}`}
                  ref={textInput}
                  documentKey={`${id}:${lesson.id}:${owner}`}
                  format="markdown"
                  value={draft}
                  onChange={edit}
                  disabled={busy}
                />
                <div className={styles.saveRow}>
                  <button
                    className={styles.primary}
                    disabled={busy || !dirty}
                    aria-describedby={!dirty ? "lesson-save-status" : undefined}
                    onClick={() => void save()}
                  >
                    {busy ? t("Сохраняем…") : t("Сохранить урок")}
                  </button>
                  {!dirty && (
                    <p id="lesson-save-status">{t("Урок сохранён")}</p>
                  )}
                </div>
                {serverLesson && (
                  <section className="request-state">
                    <h2>{t("На сервере другая версия")}</h2>
                    <p>
                      {t(
                        "Ваш текст сохранён в черновике. Сравните версии и внесите нужные изменения в поле выше.",
                      )}
                    </p>
                    <details>
                      <summary>
                        {t("Показать текст сервера (версия")}{" "}
                        {serverLesson.revision})
                      </summary>
                      <pre style={{ whiteSpace: "pre-wrap" }}>
                        {serverLesson.content}
                      </pre>
                    </details>
                    <button
                      disabled={busy}
                      onClick={() => void save(serverLesson.revision)}
                    >
                      {t("Сохранить мой текст вместо этой версии")}
                    </button>
                  </section>
                )}
                <div className={styles.toolbar}>
                  <button
                    disabled={busy}
                    onClick={() => setShowImages((value) => !value)}
                    aria-expanded={showImages}
                  >
                    {showImages
                      ? t("Закрыть иллюстрации")
                      : t("Добавить иллюстрацию")}
                  </button>
                  <button disabled={busy} onClick={() => setShowDiagram(value => !value)} aria-expanded={showDiagram}>
                    {showDiagram ? t("Закрыть редактор схемы") : t("Добавить схему")}
                  </button>
                </div>
                {showDiagram && <DiagramEditor key={`diagram:${lesson.id}`} draftKey={`${id}:${lesson.id}`} onInsert={markdown => { if (insertMarkdown(markdown)) setShowDiagram(false); }}/>}
                {showImages && (
                  <ImageLibrary
                    courseId={id!}
                    onInsert={(markdown) => {
                      if (insertMarkdown("\n" + markdown + "\n")) setShowImages(false);
                    }}
                  />
                )}

              </>
            ) : null}
          </section>
          <aside className={styles.sidebar}>
            <h2 className={styles.outlineLabel}>{t("Содержание курса")}</h2>
            {modules.map((m, moduleIndex) => (
              <section key={m.id}>
                <h2>{m.title}</h2>
                <details className={styles.moduleManagement}>
                  <summary>{t("Управление модулем")}</summary>
                <div className={styles.moduleActions}>
                  <button
                    disabled={busy}
                    aria-label={t("Редактировать модуль {v0}", { v0: m.title })}
                    onClick={() =>
                      setEditing({
                        kind: "module",
                        courseId: Number(id),
                        id: m.id,
                        revision: m.revision,
                        title: m.title,
                        description: m.description,
                      })
                    }
                  >
                    {t("Изменить")}
                  </button>
                  <button
                    disabled={busy || moduleIndex === 0}
                    aria-label={t("Поднять модуль {v0}", { v0: m.title })}
                    onClick={() =>
                      move(
                        modules,
                        moduleIndex,
                        -1,
                        `/courses/${id}/modules/order`,
                      )
                    }
                  >
                    ↑
                  </button>
                  <button
                    disabled={busy || moduleIndex === modules.length - 1}
                    aria-label={t("Опустить модуль {v0}", { v0: m.title })}
                    onClick={() =>
                      move(
                        modules,
                        moduleIndex,
                        1,
                        `/courses/${id}/modules/order`,
                      )
                    }
                  >
                    ↓
                  </button>
                  <button
                    disabled={busy}
                    className={styles.danger}
                    aria-label={t("Удалить модуль {v0}", { v0: m.title })}
                    onClick={() => removeEntity("modules", m, m.title)}
                  >
                    {t("Убрать")}
                  </button>
                </div>
                </details>
                {m.lessons.map((l, lessonIndex) => (
                  <div key={l.id} className={styles.lessonRow}>
                    <button
                      onClick={() => select(l)}
                      disabled={busy}
                      className={styles.lesson}
                      aria-pressed={selected === l.id}
                    >
                      <span className={styles.lessonNumber} aria-hidden="true">
                        {lessonIndex + 1}
                      </span>
                      <span>{l.title}</span>
                    </button>
                    <button
                      disabled={busy || lessonIndex === 0}
                      aria-label={t("Поднять урок {v0}", { v0: l.title })}
                      onClick={() =>
                        move(
                          m.lessons,
                          lessonIndex,
                          -1,
                          `/modules/${m.id}/lessons/order`,
                        )
                      }
                    >
                      ↑
                    </button>
                    <button
                      disabled={busy || lessonIndex === m.lessons.length - 1}
                      aria-label={t("Опустить урок {v0}", { v0: l.title })}
                      onClick={() =>
                        move(
                          m.lessons,
                          lessonIndex,
                          1,
                          `/modules/${m.id}/lessons/order`,
                        )
                      }
                    >
                      ↓
                    </button>
                  </div>
                ))}
                <button
                  disabled={busy}
                  className={styles.addLesson}
                  onClick={() =>
                    setEditing({
                      kind: "lesson",
                      courseId: Number(id),
                      parentId: m.id,
                      title: "",
                    })
                  }
                >
                  {t("Добавить урок +")}
                </button>
                <details>
                  <summary>
                    {t("Тесты (")}
                    {m.tests.length})
                  </summary>
                  {m.tests.map((question) => (
                    <div key={question.id}>
                      <strong>{question.question}</strong>
                      <ul>
                        {question.answers.map((a, i) => (
                          <li key={i}>
                            {a}
                            {a === question.correct_answer ? " ✓" : ""}
                          </li>
                        ))}
                      </ul>
                      <p>
                        {t("Ответ:")} {question.correct_answer}
                      </p>
                      <button
                        disabled={busy}
                        onClick={() => editTest(question, m.id)}
                      >
                        {t("Редактировать вопрос")}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          setAssessment({
                            kind: "test",
                            id: question.id,
                            title: question.question,
                            answers: question.answers,
                          })
                        }
                      >
                        {t("Тип ответа и оценивание")}
                      </button>
                      <button
                        disabled={busy}
                        className={styles.danger}
                        onClick={() =>
                          removeEntity("tests", question, question.question)
                        }
                      >
                        {t("Убрать вопрос")}
                      </button>
                    </div>
                  ))}
                  <button
                    disabled={busy}
                    onClick={() =>
                      setEditing({
                        kind: "test",
                        courseId: Number(id),
                        parentId: m.id,
                        title: "",
                      })
                    }
                  >
                    {t("Добавить вопрос")}
                  </button>
                </details>
                <details>
                  <summary>
                    {t("Практика и кейсы (")}
                    {m.tasks?.length ?? 0})
                  </summary>
                  {m.tasks?.map((task) => (
                    <article key={task.id}>
                      <strong>{task.name}</strong>
                      <MarkdownContent>{task.description}</MarkdownContent>
                      <button
                        disabled={busy}
                        onClick={() =>
                          setEditing({
                            kind: "task",
                            courseId: Number(id),
                            parentId: m.id,
                            id: task.id,
                            revision: task.revision,
                            title: task.name,
                            description: task.description,
                          })
                        }
                      >
                        {t("Редактировать задание")}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          setAssessment({
                            kind: "task",
                            id: task.id,
                            title: task.name,
                            answers: [],
                          })
                        }
                      >
                        {t("Критерии и оценивание")}
                      </button>
                      <button
                        disabled={busy}
                        className={styles.danger}
                        onClick={() => removeEntity("tasks", task, task.name)}
                      >
                        {t("Убрать задание")}
                      </button>
                    </article>
                  ))}
                  <button
                    disabled={busy}
                    onClick={() =>
                      setEditing({
                        kind: "task",
                        courseId: Number(id),
                        parentId: m.id,
                        title: "",
                      })
                    }
                  >
                    {t("Добавить практику")}
                  </button>
                </details>
              </section>
            ))}
            <details>
              <summary>
                {t("Итоговый тест (")}
                {finalTests.length})
              </summary>
              {finalTests.map((test) => (
                <article key={test.id}>
                  <strong>{test.question}</strong>
                  <ul>
                    {test.answers.map((answer, i) => (
                      <li key={i}>{answer}</li>
                    ))}
                  </ul>
                  <p>
                    {t("Ответ:")} {test.correct_answer}
                  </p>
                  <button disabled={busy} onClick={() => editTest(test)}>
                    {t("Редактировать вопрос")}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      setAssessment({
                        kind: "test",
                        id: test.id,
                        title: test.question,
                        answers: test.answers,
                      })
                    }
                  >
                    {t("Тип ответа и оценивание")}
                  </button>
                  <button
                    disabled={busy}
                    className={styles.danger}
                    onClick={() => removeEntity("tests", test, test.question)}
                  >
                    {t("Убрать вопрос")}
                  </button>
                </article>
              ))}
            </details>
          </aside>
        </div>
        <div className={styles.buttons}>
          <button disabled={!modules.length} onClick={download}>
            {t("Скачать Markdown с черновиками")}
          </button>
          <button
            className={styles.primary}
            aria-describedby={
              pendingLessons.length > 0 || !modules.length
                ? "course-publish-status"
                : undefined
            }
            disabled={
              busy ||
              pendingLessons.length > 0 ||
              !modules.length ||
              structure?.status === "published"
            }
            onClick={() => void publish()}
          >
            {structure?.status === "published"
              ? t("Опубликовано")
              : t("Опубликовать курс")}
          </button>
          {structure?.status === "published" && (
            <Link className={styles.primary} to={`/assignments?course=${id}`}>
              {t("Назначить участникам")}
            </Link>
          )}
          {(pendingLessons.length > 0 || !modules.length) && (
            <p
              className={`${styles.actionHint} ${styles.publishHint}`}
              id="course-publish-status"
            >
              {pendingLessons.length > 0
                ? t("Сначала сохраните все изменённые уроки.")
                : t("Добавьте модуль и уроки вручную или подготовьте содержание из документов.")}
            </p>
          )}
        </div>
        {user?.organization_role === "owner" && !user.is_admin && (
          <details>
            <summary>{t("Экспорт опубликованной версии: PDF и ZIP")}</summary>
            <CourseTransferPanel key={`${id}:${version}:${publicationRefresh}`} courseId={Number(id)} />
          </details>
        )}
        {assessment && (
          <AssessmentEditor
            target={assessment}
            onClose={() => setAssessment(null)}
            onSaved={() => {
              setAssessment(null);
              setVersion((value) => value + 1);
            }}
          />
        )}
        {editing && (
          <EntityEditor
            entity={editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              if (editing.kind === "lesson" && editing.id)
                clearDraft(
                  `lesson:${editing.id}`,
                  editing.content ?? "",
                  owner,
                );
              setEditing(null);
              setVersion((value) => value + 1);
            }}
          />
        )}
      </main>
    </>
  );
}
