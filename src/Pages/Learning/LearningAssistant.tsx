import { useLocale } from "@/i18n/useLocale";
import { useState } from "react";
import { api } from "@/shared/api";
import { useDurableState } from "@/hooks/useDurableState";
import MarkdownContent from "@/Components/MarkdownContent";
import { LoadingState, RequestError } from "@/Components/RequestState";
import { useLearningData } from "./useLearningData";
import { dateLabel } from "./types";
import s from "./learning.module.css";
type Message = {
  id: number;
  lesson_id: number;
  question: string;
  answer: string;
  citations: { lesson_id: number; title: string; url: string }[];
  status: string;
  error_code: string | null;
  model: string | null;
  created_at: string;
};
export default function LearningAssistant({
  assignmentId,
  lessonId,
  onLesson,
}: {
  assignmentId: number;
  lessonId: number;
  onLesson: (id: number) => void;
}) {
  const { t } = useLocale();

  const path = `/learning/assignments/${assignmentId}/assistant/messages`;
  const history = useLearningData<{ items: Message[]; total: number }>(
    path + "?limit=50",
  );
  const [draft, setDraft, clear] = useDurableState(
    `learning-assistant:${assignmentId}:${lessonId}`,
    { question: "", requestId: null as string | null },
  );
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const send = async () => {
    setBusy(true);
    setError(null);
    const sent = {
      ...draft,
      requestId: draft.requestId ?? crypto.randomUUID(),
    };
    setDraft(sent);
    try {
      const result = await api.post<Message>(path, {
        lesson_id: lessonId,
        question: sent.question,
        request_id: sent.requestId,
      });
      await history.reload();
      if (result.data.status === "completed") {
        clear(sent);
        const empty = { question: "", requestId: null };
        setDraft(empty);
        clear(empty);
      } else if (result.data.status === "failed") {
        setDraft({ ...sent, requestId: null });
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(path);
      setConfirmDelete(false);
      await history.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={s.card}>
      <div className={s.spread}>
        <h3>{t("Помощник по курсу")}</h3>
        <span className={s.badge}>{t("По материалам вашей версии")}</span>
      </div>
      <p className={s.muted}>
        {t(
          "Объясняет урок и указывает источники. Решение о результате принимает система проверки, а не диалог.",
        )}
      </p>
      {!!history.error && (
        <RequestError
          error={history.error}
          onRetry={() => void history.reload()}
        />
      )}{" "}
      {history.loading && !history.data && (
        <LoadingState>{t("Загружаем ваш диалог…")}</LoadingState>
      )}
      <div className={s.stack}>
        {history.data?.items.map((m) => (
          <article key={m.id}>
            <strong>{m.question}</strong>
            <p className={s.caption}>{dateLabel(m.created_at)}</p>
            {m.status === "completed" ? (
              <MarkdownContent>{m.answer}</MarkdownContent>
            ) : m.status === "pending" ? (
              <p role="status">
                {t("Помощник готовит ответ.")}{" "}
                <button
                  className={s.secondary}
                  onClick={() => void history.reload()}
                >
                  {t("Проверить ответ")}
                </button>
              </p>
            ) : (
              <p className={s.notice}>
                {t(
                  "Ответ не получен. Обучение и отправка заданий доступны; вопрос можно отправить снова.",
                )}
              </p>
            )}
            <div className={s.row}>
              {m.citations?.map((c) => (
                <button
                  type="button"
                  className={s.secondary}
                  key={c.lesson_id}
                  onClick={() => onLesson(c.lesson_id)}
                >
                  {c.title} ↗
                </button>
              ))}
            </div>
            <hr className={s.divider} />
          </article>
        ))}
      </div>
      <label className={s.field}>
        {t("Вопрос по открытому уроку")}
        <textarea
          value={draft.question}
          disabled={busy}
          maxLength={12000}
          onChange={(e) =>
            setDraft({ question: e.target.value, requestId: null })
          }
        />
      </label>
      {!!error && <RequestError error={error} />}
      <div className={s.stickyActions}>
        <button
          className={s.secondary}
          disabled={busy || !history.data?.items.length}
          onClick={() => setConfirmDelete(true)}
        >
          {t("Удалить мой диалог")}
        </button>
        <button
          className={s.primary}
          disabled={busy || !draft.question.trim()}
          onClick={() => void send()}
        >
          {busy
            ? t("Отправляем…")
            : draft.requestId
              ? t("Проверить отправленный вопрос")
              : t("Спросить помощника ↑")}
        </button>
      </div>
      {confirmDelete && (
        <div className={s.conflict}>
          <p>
            {t(
              "Удалить историю этого диалога? Сохранённые ответы на учебные задания останутся.",
            )}
          </p>
          <div className={s.row}>
            <button
              className={s.danger}
              disabled={busy}
              onClick={() => void remove()}
            >
              {t("Удалить историю")}
            </button>
            <button
              className={s.secondary}
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
            >
              {t("Оставить")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
