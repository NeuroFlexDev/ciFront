import { useLocale } from "@/i18n/useLocale";
import { useEffect, useState } from "react";
import { api } from "@/shared/api";
import { ApiError } from "@/shared/errors";
import { useDurableState } from "@/hooks/useDurableState";
import DraftNotice from "@/Components/DraftNotice";
import MarkdownContent from "@/Components/MarkdownContent";
import { RequestError } from "@/Components/RequestState";
import type {
  Answer,
  Assessment,
  AssignmentDetail,
  LearnerResponse,
} from "./types";
import { dateLabel, stateLabel } from "./types";
import s from "./learning.module.css";

type AnswerDraft = {
  answer: Answer;
  expected_revision: number;
  attempt: number;
  submission_key: string | null;
  dirty: boolean;
};
const answerText = (a: Answer) => a.text ?? a.selected?.join("\n") ?? "";

export function AnswerForm({
  assignmentId,
  assessment,
  attempt,
  server,
  onSaved,
}: {
  assignmentId: number;
  assessment: Assessment;
  attempt: number;
  server?: LearnerResponse;
  onSaved: () => Promise<void>;
}) {
  const { t } = useLocale();

  const [draft, setDraft, clearDraft] = useDurableState<AnswerDraft>(
    `learning:${assignmentId}:${assessment.id}:attempt:${attempt}`,
    {
      answer:
        server?.answer ??
        (assessment.question_type === "open" ? { text: "" } : { selected: [] }),
      expected_revision: server?.revision ?? 0,
      attempt,
      submission_key: null,
      dirty: false,
    },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [conflict, setConflict] = useState<LearnerResponse | null>(null);
  const [notice, setNotice] = useState("");
  const [confirmed, setConfirmed] = useState<LearnerResponse | null>(null);
  const drift =
    server && server.revision > draft.expected_revision && draft.dirty;
  useEffect(() => {
    if (!draft.dirty) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [draft.dirty]);
  const change = (answer: Answer) => {
    setDraft({ ...draft, answer, dirty: true, submission_key: null });
    setNotice("");
  };
  const refreshConflict = async () => {
    const latest = await api.get<AssignmentDetail>(
      `/learning/assignments/${assignmentId}`,
    );
    const found = latest.data.responses.find(
      (r) => r.assessment_id === assessment.id && r.attempt === attempt,
    );
    setConflict(found ?? null);
    return found;
  };
  const save = async (submit: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice("");
    const sent = {
      ...draft,
      submission_key: submit
        ? (draft.submission_key ?? crypto.randomUUID())
        : null,
    };
    setDraft(sent);
    try {
      const body = {
        answer: sent.answer,
        expected_revision: sent.expected_revision,
        attempt: sent.attempt,
      };
      const result = submit
        ? await api.post<LearnerResponse>(
            `/learning/assignments/${assignmentId}/responses/${assessment.id}/submit`,
            { ...body, submission_key: sent.submission_key },
          )
        : await api.put<LearnerResponse>(
            `/learning/assignments/${assignmentId}/responses/${assessment.id}`,
            body,
          );
      clearDraft(sent);
      const clean = {
        ...sent,
        expected_revision: result.data.revision,
        submission_key: null,
        dirty: false,
      };
      setDraft(clean);
      clearDraft(clean);
      setConflict(null);
      setNotice(
        submit
          ? t("Ответ принят сервером.")
          : t("Черновик сохранён на сервере."),
      );
      if (result.data.status !== "draft") setConfirmed(result.data);
      await onSaved();
    } catch (e) {
      setError(e);
      if (e instanceof ApiError && e.status === 409) {
        try {
          await refreshConflict();
        } catch {
          /* Keep the local recovery copy when the comparison cannot be fetched. */
        }
      }
    } finally {
      setBusy(false);
    }
  };
  const remote = conflict ?? (drift ? server : null);
  if (confirmed)
    return (
      <section className={s.notice} role="status">
        <h3>{t("Ответ принят сервером")}</h3>
        <p>
          {t("Попытка") + " "}
          {confirmed.attempt} ·{" "}
          {t(stateLabel[confirmed.status] ?? String(confirmed.status))}
          {t(". Отправка этой попытки завершена.")}
        </p>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {answerText(confirmed.answer)}
        </pre>
        {confirmed.points !== null && (
          <p>
            {confirmed.points} / {confirmed.max_points}
            {" " + t("баллов")}
          </p>
        )}
        <button className={s.secondary} onClick={() => void onSaved()}>
          {t("Обновить результат")}
        </button>
      </section>
    );
  return (
    <div className={s.stack}>
      {draft.dirty && <DraftNotice restored />}
      {remote && (
        <section className={s.conflict} role="alert">
          <h3>{t("Есть другая сохранённая версия ответа")}</h3>
          <p>
            {t(
              "Сравните тексты перед продолжением. Ваш черновик остаётся на устройстве.",
            )}
          </p>
          <div className={s.compare}>
            <div>
              <strong>{t("Ваш текст")}</strong>
              <pre>{answerText(draft.answer) || t("Ответ не заполнен")}</pre>
            </div>
            <div>
              <strong>
                {t("Сервер ·") + " "}
                {t(stateLabel[remote.status] ?? String(remote.status))}
              </strong>
              <pre>{answerText(remote.answer)}</pre>
            </div>
          </div>
          <div className={s.row}>
            {remote.status === "draft" && (
              <button
                type="button"
                className={s.primary}
                disabled={busy}
                onClick={() => {
                  setDraft({
                    ...draft,
                    expected_revision: remote.revision,
                    submission_key: null,
                    dirty: true,
                  });
                  setConflict(null);
                  setError(null);
                }}
              >
                {t("Продолжить с моим текстом")}
              </button>
            )}
            <button
              type="button"
              className={s.secondary}
              disabled={busy}
              onClick={() => {
                const copy = {
                  answer: remote.answer,
                  expected_revision: remote.revision,
                  attempt: remote.attempt,
                  submission_key: null,
                  dirty: false,
                };
                setDraft(copy);
                clearDraft(copy);
                setConflict(null);
                setError(null);
                void onSaved();
              }}
            >
              {t("Использовать подтверждённый ответ")}
            </button>
          </div>
        </section>
      )}
      {assessment.question_type === "open" ? (
        <label className={s.field}>
          {t("Ваш ответ")}
          <textarea
            className={s.answer}
            disabled={busy}
            maxLength={100000}
            value={draft.answer.text ?? ""}
            onChange={(e) => change({ text: e.target.value })}
            placeholder={t("Опишите решение своими словами…")}
          />
        </label>
      ) : (
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className={s.muted}>
            {assessment.question_type === "single"
              ? t("Выберите один ответ")
              : t("Выберите все подходящие ответы")}
          </legend>
          <div className={s.stack} style={{ gap: 10, marginTop: 14 }}>
            {assessment.answers.map((option, i) => (
              <label className={s.choice} key={i}>
                <input
                  type={
                    assessment.question_type === "single" ? "radio" : "checkbox"
                  }
                  name={`${assessment.id}-${attempt}`}
                  disabled={busy}
                  checked={(draft.answer.selected ?? []).includes(option)}
                  onChange={(e) =>
                    change({
                      selected:
                        assessment.question_type === "single"
                          ? [option]
                          : e.target.checked
                            ? [...(draft.answer.selected ?? []), option]
                            : (draft.answer.selected ?? []).filter(
                                (v) => v !== option,
                              ),
                    })
                  }
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!!error && <RequestError error={error} />}{" "}
      {notice && (
        <p className={s.notice} role="status">
          {notice}
        </p>
      )}
      <div className={s.row}>
        <button
          className={s.secondary}
          type="button"
          disabled={busy || !!remote}
          onClick={() => void save(false)}
        >
          {busy ? t("Сохраняем…") : t("Сохранить черновик")}
        </button>
        <button
          className={s.primary}
          type="button"
          disabled={
            busy ||
            !!remote ||
            !(draft.answer.text?.trim() || draft.answer.selected?.length)
          }
          onClick={() => void save(true)}
        >
          {busy
            ? t("Отправляем…")
            : draft.submission_key
              ? t("Проверить и повторить отправку")
              : t("Отправить на проверку →")}
        </button>
        <span className={s.muted}>
          {t("Попытка") + " "}
          {attempt}
        </span>
      </div>
      <p className={s.caption}>
        {t(
          "После отправки эта попытка остаётся в истории. При обрыве связи повтор использует тот же идентификатор отправки.",
        )}
      </p>
    </div>
  );
}

export default function AssessmentAnswer({
  assignmentId,
  assessment,
  responses,
  onSaved,
}: {
  assignmentId: number;
  assessment: Assessment;
  responses: LearnerResponse[];
  onSaved: () => Promise<void>;
}) {
  const { t } = useLocale();

  const [newAttempt, setNewAttempt] = useState(false);
  const attempts = responses
    .filter((r) => r.assessment_id === assessment.id)
    .sort((a, b) => a.attempt - b.attempt);
  const latest = attempts.at(-1);
  const showForm = !latest || latest.status === "draft" || newAttempt;
  const attempt =
    latest && latest.status !== "draft"
      ? latest.attempt + 1
      : (latest?.attempt ?? 1);
  const afterSave = async () => {
    await onSaved();
    setNewAttempt(false);
  };
  return (
    <section className={s.article}>
      <div className={s.spread}>
        <span className={s.badge}>
          {assessment.question_type === "open"
            ? t("Практика")
            : assessment.question_type === "multiple"
              ? t("Несколько ответов")
              : t("Один ответ")}
        </span>
        <span>
          {assessment.max_points}
          {" " + t("балл.")}
        </span>
      </div>
      <h2>{assessment.question}</h2>
      {assessment.description && (
        <MarkdownContent>{assessment.description}</MarkdownContent>
      )}
      {!!assessment.criteria.length && (
        <details>
          <summary>{t("Критерии проверки")}</summary>
          <ul>
            {assessment.criteria.map((c) => (
              <li key={c.id}>
                <strong>{c.title}</strong>
                {" " + t("— до") + " "}
                {c.max_points}
                {" " + t("балл.")} {c.description}
              </li>
            ))}
          </ul>
        </details>
      )}
      {attempts
        .filter((r) => r.status !== "draft")
        .map((r) => (
          <div key={r.id} className={s.card} style={{ margin: "18px 0" }}>
            <div className={s.spread}>
              <span>
                {t("Попытка") + " "}
                {r.attempt} · {t(stateLabel[r.status] ?? String(r.status))}
              </span>
              {r.points !== null && (
                <strong>
                  {r.points} / {r.max_points}
                </strong>
              )}
            </div>
            <p className={s.muted}>{dateLabel(r.submitted_at)}</p>
            <details>
              <summary>{t("Ваш отправленный ответ")}</summary>
              <pre style={{ whiteSpace: "pre-wrap" }}>
                {answerText(r.answer)}
              </pre>
            </details>
            {r.feedback && <p>{r.feedback}</p>}
            {r.correct_answers && (
              <div className={s.notice}>
                <strong>{t("Разбор открыт по правилам обучения")}</strong>
                <p>{r.correct_answers.join(" · ")}</p>
              </div>
            )}
          </div>
        ))}
      {showForm ? (
        <AnswerForm
          key={`${assessment.id}-${attempt}`}
          assignmentId={assignmentId}
          assessment={assessment}
          attempt={attempt}
          server={latest?.status === "draft" ? latest : undefined}
          onSaved={afterSave}
        />
      ) : latest?.can_retry ? (
        <button
          type="button"
          className={s.secondary}
          onClick={() => setNewAttempt(true)}
        >
          {t("Начать следующую попытку")}
        </button>
      ) : (
        <p className={s.muted}>
          {latest?.status === "pending_review"
            ? t(
                "Проверяющий увидит вашу работу в очереди. Ответ сохранён; можно продолжать обучение.",
              )
            : t(
                "Дополнительная попытка сейчас недоступна по правилам назначения.",
              )}
        </p>
      )}
    </section>
  );
}
