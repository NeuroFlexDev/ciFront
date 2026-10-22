import { useLocale } from "@/i18n/useLocale";
import { useEffect, useRef, useState } from "react";
import { X, FileText } from "lucide-react";
import {useDialogFocus} from '@/hooks/useDialogFocus';
import { api, authSessionIsCurrent, captureAuthSession } from "@/shared/api";
import { useDurableState } from "@/hooks/useDurableState";
import { RequestError } from "@/Components/RequestState";
import DraftNotice from "@/Components/DraftNotice";
import TextEditor from "@/Components/ElementUi/TextEditor/TextEditor";
import { useEditorCopy } from "@/Components/ElementUi/TextEditor/editorCopy";
import styles from "./entityEditor.module.css";

export type EditableEntity = {
  kind: "course" | "module" | "lesson" | "test" | "task";
  courseId: number;
  id?: number;
  parentId?: number;
  revision?: number;
  title: string;
  description?: string;
  content?: string;
  answers?: string[];
  correct_answer?: string;
};
const labels = {
  course: "курс",
  module: "модуль",
  lesson: "урок",
  test: "вопрос теста",
  task: "практическое задание",
};
export default function EntityEditor({
  entity,
  onClose,
  onSaved,
}: {
  entity: EditableEntity;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLocale();
  const copy = useEditorCopy();

  const resource = `editor:${entity.kind}:${entity.id ?? `new:${entity.courseId}:${entity.parentId ?? "final"}`}`;
  const [form, setForm, clearForm] = useDurableState(resource, {
    title: entity.title,
    description: entity.description ?? "",
    content: entity.content ?? "",
    answers: entity.answers?.join("\n") ?? "",
    correct_answer: entity.correct_answer ?? "",
    expected_revision: entity.revision ?? 0,
  });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const pending = useRef<{ cancelled: boolean } | null>(null);
  useEffect(() => {
    pending.current = null;
    setBusy(false);
    return () => { if (pending.current) pending.current.cancelled = true; };
  }, [resource]);
  useDialogFocus(dialog,{busy,onClose});
  async function save() {
    if (busy) return;
    const request = { cancelled: false };
    pending.current = request;
    const session = captureAuthSession();
    const current = () => pending.current === request && !request.cancelled && authSessionIsCurrent(session);
    setBusy(true);
    setError(null);
    try {
      const answers = form.answers
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean);
      if (
        entity.kind === "test" &&
        answers.length &&
        (!form.correct_answer || !answers.includes(form.correct_answer))
      )
        throw new Error(
          t("Правильный ответ должен точно совпадать с одним из вариантов."),
        );
      const body =
        entity.kind === "course"
          ? {
              title: form.title,
              description: form.description,
              expected_revision: form.expected_revision,
            }
          : entity.kind === "test"
            ? {
                question: form.title,
                answers,
                correct_answer: form.correct_answer,
              }
            : entity.kind === "task"
              ? { name: form.title, description: form.description }
              : {
                  title: form.title,
                  description: form.description,
                  ...(entity.kind === "lesson"
                    ? { content: form.content }
                    : {}),
                };
      if (entity.id) {
        const plural = {
          course: "courses",
          module: "modules",
          lesson: "lessons",
          test: "tests",
          task: "tasks",
        }[entity.kind];
        await api.put(`/${plural}/${entity.id}`, {
          ...body,
          expected_revision: form.expected_revision,
        });
      } else {
        const path =
          entity.kind === "module"
            ? `/courses/${entity.courseId}/modules/`
            : entity.kind === "lesson"
              ? `/courses/${entity.courseId}/modules/${entity.parentId}/lessons/`
              : entity.kind === "task"
                ? `/modules/${entity.parentId}/tasks/`
                : entity.parentId
                  ? `/modules/${entity.parentId}/tests/`
                  : `/courses/${entity.courseId}/tests/`;
        await api.post(path, body);
      }
      if (!current()) return;
      clearForm(form);
      onSaved();
    } catch (reason) {
      if (current()) setError(reason);
    } finally {
      if (current()) { pending.current = null; setBusy(false); }
    }
  }
  return (
    <div className={styles.overlay}>
      <div
        ref={dialog}
        tabIndex={-1}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entity-title"
      >
        <header className={styles.header}>
          <div><span className={styles.eyebrow}><FileText size={15}/>{copy("Редактирование")}</span>
        <h2 id="entity-title">
          {entity.id ? t("Редактировать") : t("Добавить")}{" "}
          {t(labels[entity.kind] ?? String(entity.kind))}
        </h2>
          </div>
          <button type="button" className={styles.close} disabled={busy} onClick={onClose} aria-label={copy("Закрыть редактор, сохранив черновик")}><X size={22}/></button>
        </header>
        <DraftNotice />
        {!!error && <RequestError error={error} />}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label>
            {entity.kind === "test" ? t("Вопрос") : t("Название")}
            <input
              required
              maxLength={2000}
              value={form.title}
              disabled={busy}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
          </label>
          {entity.kind !== "test" && (
            <label>
              {entity.kind === "task"
                ? t("Условие задания (Markdown)")
                : t("Описание")}
              <textarea
                rows={entity.kind === "task" ? 7 : 3}
                value={form.description}
                required={entity.kind === "task"}
                disabled={busy}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </label>
          )}
          {entity.kind === "lesson" && (
            <section className={styles.contentSection}>
              <h3>{copy("Содержание урока")}</h3>
              <TextEditor
                key={resource}
                documentKey={resource}
                format="markdown"
                ariaLabel={copy("Содержание урока")}
                value={form.content}
                disabled={busy}
                onChange={(content) =>
                  setForm(previous => ({ ...previous, content }))
                }
              />
            </section>
          )}
          {entity.kind === "test" && (
            <>
              <label>
                {t("Варианты ответов — каждый на отдельной строке")}
                <textarea
                  rows={5}
                  value={form.answers}
                  disabled={busy}
                  onChange={(event) =>
                    setForm({ ...form, answers: event.target.value })
                  }
                />
              </label>
              <label>
                {t("Правильный ответ")}
                <input
                  value={form.correct_answer}
                  disabled={busy}
                  onChange={(event) =>
                    setForm({ ...form, correct_answer: event.target.value })
                  }
                />
              </label>
              <p>
                {t(
                  "Для открытого ответа оставьте варианты пустыми и настройте критерии после сохранения вопроса.",
                )}
              </p>
            </>
          )}
          <div className={styles.buttons}>
            <button type="button" disabled={busy} onClick={onClose}>
              {t("Закрыть, сохранив черновик")}
            </button>
            <button className={styles.primary} disabled={busy}>
              {busy ? t("Сохраняем…") : t("Сохранить")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
