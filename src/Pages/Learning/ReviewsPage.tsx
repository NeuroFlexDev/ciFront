import { useLocale } from "@/i18n/useLocale";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/shared/api";
import { ApiError } from "@/shared/errors";
import { Shell } from "@/Pages/Workspace/shared";
import { LoadingState, RequestError } from "@/Components/RequestState";
import DraftNotice from "@/Components/DraftNotice";
import { useDurableState } from "@/hooks/useDurableState";
import { useLearningData } from "./useLearningData";
import { type Review, type AIProposal, dateLabel, stateLabel } from "./types";
import s from "./learning.module.css";

export default function ReviewsPage() {
  const { t } = useLocale();

  const [status, setStatus] = useState("pending_review");
  const [params, setParams] = useSearchParams();
  const selected = params.get("response");
  const queue = useLearningData<{ items: Review[] }>(
    `/learning/reviews?status=${status}`,
  );
  const detail = useLearningData<Review>(
    selected ? `/learning/reviews/${selected}` : null,
  );
  return (
    <Shell
      title={t("Проверка работ")}
      description={t(
        "Работы закреплённых за вами участников. Каждая оценка и её пересмотр остаются в истории.",
      )}
    >
      <div className={s.page}>
        <div className={s.tablist}>
          <button
            aria-selected={status === "pending_review"}
            onClick={() => setStatus("pending_review")}
          >
            {t("Ожидают проверки")}
          </button>
          <button
            aria-selected={status === "reviewed"}
            onClick={() => setStatus("reviewed")}
          >
            {t("Проверенные")}
          </button>
        </div>
        {!!queue.error && (
          <RequestError
            error={queue.error}
            onRetry={() => void queue.reload()}
          />
        )}{" "}
        {queue.loading && !queue.data && (
          <LoadingState>{t("Загружаем очередь…")}</LoadingState>
        )}
        <div className={s.layout}>
          <div className={s.stack}>
            {!!detail.error && (
              <RequestError
                error={detail.error}
                onRetry={() => void detail.reload()}
              />
            )}{" "}
            {selected && !detail.data && detail.loading && (
              <LoadingState>{t("Загружаем ответ и историю…")}</LoadingState>
            )}
            {detail.data ? (
              <ReviewForm
                key={detail.data.id}
                review={detail.data}
                onSaved={async () => {
                  await Promise.all([detail.reload(), queue.reload()]);
                }}
              />
            ) : (
              <section className={s.empty}>
                <h2>
                  {queue.data?.items.length
                    ? t("Выберите работу")
                    : t("В вашей области сейчас нет работ")}
                </h2>
                <p>
                  {t(
                    "Здесь появятся ответы участников назначенных вам курсов, групп или подразделений.",
                  )}
                </p>
              </section>
            )}
          </div>
          <aside className={s.rail}>
            <h2>
              {t("Работы ·") + " "}
              {queue.data?.items.length ?? "…"}
            </h2>
            {queue.data?.items.map((r) => (
              <button
                className={s.railItem}
                key={r.id}
                aria-current={selected === String(r.id)}
                onClick={() => setParams({ response: String(r.id) })}
              >
                <strong>{r.attempt}</strong>
                <span>
                  {r.full_name || t("Участник {v0}", { v0: r.user_id })}
                  <small>{r.course_title}</small>
                  <span className={s.caption}>
                    {t(stateLabel[r.status] ?? String(r.status))} ·{" "}
                    {dateLabel(r.submitted_at)}
                  </span>
                </span>
              </button>
            ))}
          </aside>
        </div>
      </div>
    </Shell>
  );
}

function ReviewForm({
  review,
  onSaved,
}: {
  review: Review;
  onSaved: () => Promise<void>;
}) {
  const { t } = useLocale();

  const [draft, setDraft, clear] = useDurableState(
    `learning-review:${review.id}`,
    {
      expected_revision: review.revision,
      points: String(review.points ?? 0),
      feedback: "",
      criteria: review.assessment.criteria.map((c) => ({
        id: c.id,
        points: "0",
      })),
      dirty: false,
    },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState("");
  const [conflict, setConflict] = useState(false);
  const criteria = review.assessment.criteria;
  const total = criteria.length
    ? draft.criteria.reduce((v, c) => v + Number(c.points || 0), 0)
    : Number(draft.points || 0);
  useEffect(() => {
    if (!draft.dirty) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [draft.dirty]);
  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved("");
    try {
      const result = await api.post<Review>(
        `/learning/reviews/${review.id}/grade`,
        {
          expected_revision: draft.expected_revision,
          points: total,
          feedback: draft.feedback,
          criteria_scores: draft.criteria.map((c) => ({
            id: c.id,
            points: Number(c.points),
          })),
        },
      );
      clear(draft);
      const clean = {
        ...draft,
        expected_revision: result.data.revision,
        dirty: false,
      };
      setDraft(clean);
      clear(clean);
      setSaved(t("Оценка сохранена. Участник видит этот результат."));
      setConflict(false);
      await onSaved();
    } catch (e) {
      setError(e);
      if (e instanceof ApiError && e.status === 409) {
        setConflict(true);
        await onSaved();
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className={s.article}>
      <div className={s.spread}>
        <span className={s.badge}>
          {t(stateLabel[review.status] ?? String(review.status))}
          {" " + t("· попытка") + " "}
          {review.attempt}
        </span>
        <span>
          {t("До") + " "}
          {review.max_points}
          {" " + t("баллов")}
        </span>
      </div>
      <h2>{review.assessment.question}</h2>
      {review.assessment.description && <p>{review.assessment.description}</p>}
      <p className={s.muted}>
        {t("Отправлено:") + " "}
        {dateLabel(review.submitted_at)}
      </p>
      <section className={s.card}>
        <h3>{t("Ответ участника")}</h3>
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
          {review.answer.text ?? review.answer.selected?.join("\n")}
        </pre>
      </section>
      {draft.dirty && <DraftNotice />}
      {(conflict || draft.expected_revision !== review.revision) && (
        <section className={s.conflict}>
          <h3>{t("Оценка была изменена")}</h3>
          <p>
            {t("На сервере:") + " "}
            {review.points ?? t("не выставлена")}
            {" " + t("балл. Комментарий:")}{" "}
            {review.feedback || t("не добавлен")}
          </p>
          <p>
            {t(
              "Ваш комментарий и баллы сохранены на устройстве. Подтвердите пересмотр после сравнения.",
            )}
          </p>
          <button
            className={s.secondary}
            onClick={() => {
              setDraft({
                ...draft,
                expected_revision: review.revision,
                dirty: true,
              });
              setConflict(false);
            }}
          >
            {t("Оформить мою оценку как новый пересмотр")}
          </button>
        </section>
      )}
      {review.assessment.grading_mode === "ai_assisted" && (
        <Proposal
          review={review}
          disabled={busy}
          onApply={(proposal) =>
            setDraft({
              ...draft,
              points: String(proposal.points ?? 0),
              feedback: proposal.feedback,
              criteria: proposal.criteria_scores.map((c) => ({
                id: c.id,
                points: String(c.points),
              })),
              expected_revision: proposal.response_revision,
              dirty: true,
            })
          }
        />
      )}
      <div className={s.stack} style={{ marginTop: 24 }}>
        {criteria.length ? (
          criteria.map((c) => (
            <label className={s.field} key={c.id}>
              {c.title}
              {" " + t("· максимум") + " "}
              {c.max_points}
              <span className={s.muted}>{c.description}</span>
              {!!c.levels?.length&&<span className={s.muted}>{c.levels.map((level,index)=><span style={{display:'block'}} key={index}>{level.title} — {level.points} {t('баллов')}. {level.description}</span>)}</span>}
              <input
                type="number"
                min={0}
                max={c.max_points}
                step="0.1"
                disabled={busy}
                value={draft.criteria.find((v) => v.id === c.id)?.points ?? "0"}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    criteria: draft.criteria.map((v) =>
                      v.id === c.id ? { ...v, points: e.target.value } : v,
                    ),
                    dirty: true,
                  })
                }
              />
            </label>
          ))
        ) : (
          <label className={s.field}>
            {t("Балл")}
            <input
              type="number"
              min={0}
              max={review.max_points}
              step="0.1"
              disabled={busy}
              value={draft.points}
              onChange={(e) =>
                setDraft({ ...draft, points: e.target.value, dirty: true })
              }
            />
          </label>
        )}
        <label className={s.field}>
          {t("Комментарий участнику")}
          <textarea
            disabled={busy}
            value={draft.feedback}
            maxLength={50000}
            onChange={(e) =>
              setDraft({ ...draft, feedback: e.target.value, dirty: true })
            }
          />
        </label>
        <div className={s.spread}>
          <strong>
            {t("Итого:") + " "}
            {Number.isFinite(total) ? total : "—"} / {review.max_points}
          </strong>
          <button
            className={s.primary}
            disabled={
              busy ||
              !draft.feedback.trim() ||
              total < 0 ||
              total > review.max_points ||
              !Number.isFinite(total) ||
              draft.expected_revision !== review.revision
            }
            onClick={() => void save()}
          >
            {busy
              ? t("Сохраняем…")
              : review.status === "reviewed"
                ? t("Сохранить пересмотр оценки")
                : t("Выставить оценку")}
          </button>
        </div>
      </div>
      {!!error && <RequestError error={error} />}{" "}
      {saved && (
        <p className={s.notice} role="status">
          {saved}
        </p>
      )}
      {!!review.history?.length && (
        <details open>
          <summary>{t("История оценок")}</summary>
          <div className={s.history}>
            {review.history.map((h) => (
              <section key={h.id}>
                <strong>
                  {h.points}
                  {" " + t("балл.")}
                </strong>
                <p className={s.caption}>
                  {dateLabel(h.created_at)} ·{" "}
                  {h.actor_id
                    ? t("Проверяющий {v0}", { v0: h.actor_id })
                    : t("Автоматическая проверка")}
                  {h.old_points !== null
                    ? t(" · ранее {v0} балл.", { v0: h.old_points })
                    : ""}
                </p>
                <p>{h.feedback}</p>
              </section>
            ))}
          </div>
        </details>
      )}
    </article>
  );
}

function Proposal({
  review,
  disabled,
  onApply,
}: {
  review: Review;
  disabled: boolean;
  onApply: (p: AIProposal) => void;
}) {
  const { t } = useLocale();

  const [request, setRequest, clear] = useDurableState(
    `review-ai:${review.id}`,
    { request_id: null as string | null, expected_revision: review.revision },
  );
  const [local, setLocal] = useState<AIProposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const proposal = local ?? review.grading_metadata?.ai_proposal;
  const generate = async () => {
    const sent = request.request_id
      ? request
      : { request_id: crypto.randomUUID(), expected_revision: review.revision };
    setRequest(sent);
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<AIProposal>(
        `/learning/reviews/${review.id}/ai-proposal`,
        sent,
      );
      setLocal(result.data);
      if (result.data.status !== "pending") {
        clear(sent);
        const clean = { request_id: null, expected_revision: review.revision };
        setRequest(clean);
        clear(clean);
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={s.card} style={{ marginTop: 24 }}>
      <h3>{t("Предложение AI по критериям")}</h3>
      <p className={s.muted}>
        {t(
          "Предложение не выставляет оценку. Сравните его с ответом, при необходимости измените баллы и отдельно подтвердите итоговую оценку.",
        )}
      </p>
      {proposal && (
        <>
          <p>
            {proposal.status === "pending"
              ? t("Предложение готовится")
              : proposal.status === "failed"
                ? t(
                    "Предложение получить не удалось. Ручная проверка доступна.",
                  )
                : t("{v0} балл. · {v1}", {
                    v0: String(proposal.points),
                    v1: proposal.model ?? "AI",
                  })}
          </p>
          {proposal.status === "completed" && (
            <>
              <p>{proposal.feedback}</p>
              {proposal.criteria_scores.map((c) => (
                <p key={c.id}>
                  {review.assessment.criteria.find((v) => v.id === c.id)
                    ?.title ?? c.id}
                  : {c.points}
                </p>
              ))}
              <button
                className={s.secondary}
                disabled={
                  disabled || proposal.response_revision !== review.revision
                }
                onClick={() => onApply(proposal)}
              >
                {t("Перенести в форму ручной оценки")}
              </button>
              {proposal.response_revision !== review.revision && (
                <p className={s.caption}>
                  {t(
                    "Ответ или оценка изменились после этого предложения. Оно не может заменить текущую оценку.",
                  )}
                </p>
              )}
            </>
          )}
        </>
      )}
      {!!error && <RequestError error={error} />}
      <button
        className={s.secondary}
        style={{ marginTop: 16 }}
        disabled={disabled || busy}
        onClick={() => void generate()}
      >
        {busy
          ? t("Запрашиваем…")
          : request.request_id
            ? t("Проверить запрос предложения")
            : t("Запросить предложение AI")}
      </button>
    </section>
  );
}
