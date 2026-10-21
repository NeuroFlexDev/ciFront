import { useEffect, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { useLocale } from "@/i18n/useLocale";
import { api } from "@/shared/api";
import { useDurableState } from "@/hooks/useDurableState";
import { Shell } from "@/Pages/Workspace/shared";
import { LoadingState, RequestError } from "@/Components/RequestState";
import MarkdownContent from "@/Components/MarkdownContent";
import { useLearningData } from "../Learning/useLearningData";
import {
  type AssignmentDetail,
  type LearnerResponse,
  dateLabel,
} from "../Learning/types";
import { ActionStatus, useTeamAction } from "./TeamTools";
import s from "../Learning/learning.module.css";

type Grant = {
  id: number;
  organization_id: number;
  organization_name: string;
  operator_id: number;
  operator_name: string;
  scope_type: "course" | "assignment";
  scope_id: number;
  reason: string;
  requested_hours: number;
  revision: number;
  status: "pending" | "approved" | "rejected" | "revoked" | "expired";
  created_at: string;
  expires_at: string | null;
  decision_comment: string;
};
type SupportContent = {
  grant: Grant;
  content: AssignmentDetail["content"];
  responses: LearnerResponse[];
};
const labels = {
  pending: "Ожидает владельца",
  approved: "Разрешён",
  rejected: "Отклонён",
  revoked: "Отозван",
  expired: "Срок истёк",
};

export default function SupportAccessPage() {
  const { user } = useAuth(),
    { t } = useLocale();
  const allowed = Boolean(
    user?.is_admin || user?.organization_role === "owner",
  );
  const [page, setPage] = useState(0);
  const grants = useLearningData<{ items: Grant[]; total: number }>(
    allowed ? `/support/grants?limit=20&offset=${page * 20}` : null,
  );
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <Shell
      title={t("Доступ поддержки")}
      description={t(
        "Временное чтение одного курса или назначения по разрешению владельца организации.",
      )}
    >
      <div className={s.page}>
        {!allowed ? (
          <section className={s.empty}>
            <h2>{t("Доступ ограничен")}</h2>
            <p>
              {t(
                "Запрос отправляет оператор, решение принимает владелец организации.",
              )}
            </p>
          </section>
        ) : (
          <>
            <p className={s.notice}>
              {t(
                "Разрешение не позволяет изменять курс, ответы, оценки или права. Каждый просмотр записывается в журнал.",
              )}
            </p>
            {user?.is_admin && <RequestForm onSaved={grants.reload} />}
            <div className={s.spread}>
              <h2>{t("Запросы и разрешения")}</h2>
              <button
                className={s.secondary}
                disabled={grants.loading}
                onClick={() => void grants.reload()}
              >
                {t("Обновить")}
              </button>
            </div>
            {!!grants.error && (
              <RequestError
                error={grants.error}
                onRetry={() => void grants.reload()}
              />
            )}
            {grants.loading && !grants.data && (
              <LoadingState>{t("Загружаем разрешения…")}</LoadingState>
            )}
            {grants.data && !grants.data.items.length && (
              <p className={s.empty}>{t("Запросов поддержки пока нет.")}</p>
            )}
            <div className={s.stack}>
              {grants.data?.items.map((grant) => (
                <GrantCard
                  key={`${grant.id}:${grant.revision}`}
                  grant={grant}
                  operator={!!user?.is_admin}
                  onSaved={async () => {
                    setSelected(null);
                    await grants.reload();
                  }}
                  onOpen={() => setSelected(grant.id)}
                />
              ))}
            </div>
            {grants.data && grants.data.total > 20 && (
              <div className={s.row}>
                <button
                  className={s.secondary}
                  disabled={!page || grants.loading}
                  onClick={() => {
                    setSelected(null);
                    setPage(page - 1);
                  }}
                >
                  {t("Назад")}
                </button>
                <span>
                  {page + 1} / {Math.ceil(grants.data.total / 20)}
                </span>
                <button
                  className={s.secondary}
                  disabled={
                    (page + 1) * 20 >= grants.data.total || grants.loading
                  }
                  onClick={() => {
                    setSelected(null);
                    setPage(page + 1);
                  }}
                >
                  {t("Далее")}
                </button>
              </div>
            )}
            {selected &&
              grants.data?.items.some(
                (g) => g.id === selected && g.status === "approved",
              ) && (
                <SupportPreview
                  key={selected}
                  grantId={selected}
                  onClose={() => setSelected(null)}
                />
              )}
          </>
        )}
      </div>
    </Shell>
  );
}

function RequestForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const { t } = useLocale(),
    action = useTeamAction();
  const organizations = useLearningData<{
    items: { id: number; name: string }[];
  }>("/admin/organizations?limit=100");
  const [draft, setDraft, clear] = useDurableState("support-access-request", {
    organization_id: "",
    scope_type: "course",
    scope_id: "",
    reason: "",
    requested_hours: 1,
  });
  return (
    <form
      className={s.card}
      onSubmit={(event) => {
        event.preventDefault();
        void action.run(async () => {
          await api.post("/support/grants", {
            ...draft,
            organization_id: Number(draft.organization_id),
            scope_id: Number(draft.scope_id),
          });
          clear(draft);
          await onSaved();
        }, t("Запрос отправлен владельцу. До подтверждения содержание недоступно."));
      }}
    >
      <h2>{t("Запросить разрешение")}</h2>
      {!!organizations.error && (
        <RequestError
          error={organizations.error}
          onRetry={() => void organizations.reload()}
        />
      )}
      <fieldset
        disabled={action.busy}
        style={{ border: 0, padding: 0, margin: 0 }}
      >
        <div className={s.formGrid}>
          <label className={s.field}>
            {t("Организация")}
            <input
              required
              type="number"
              min={1}
              list="support-organizations"
              value={draft.organization_id}
              onChange={(e) =>
                setDraft({ ...draft, organization_id: e.target.value })
              }
            />
            <datalist id="support-organizations">
              {organizations.data?.items.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} · {o.id}
                </option>
              ))}
            </datalist>
          </label>
          <label className={s.field}>
            {t("Объект доступа")}
            <select
              value={draft.scope_type}
              onChange={(e) =>
                setDraft({ ...draft, scope_type: e.target.value })
              }
            >
              <option value="course">
                {t("Курс: материалы без ключей ответов")}
              </option>
              <option value="assignment">
                {t(
                  "Назначение: материалы, ответы и результаты одного участника",
                )}
              </option>
            </select>
          </label>
          <label className={s.field}>
            {t("Номер курса или назначения")}
            <input
              type="number"
              required
              min={1}
              value={draft.scope_id}
              onChange={(e) => setDraft({ ...draft, scope_id: e.target.value })}
            />
            <small>
              {t("Номер из адреса страницы, которую указал владелец.")}
            </small>
          </label>
          <label className={s.field}>
            {t("Срок доступа, часов")}
            <input
              type="number"
              required
              min={1}
              max={24}
              value={draft.requested_hours}
              onChange={(e) =>
                setDraft({ ...draft, requested_hours: Number(e.target.value) })
              }
            />
          </label>
          <label className={s.field} style={{ gridColumn: "1 / -1" }}>
            {t("Зачем нужен доступ")}
            <textarea
              required
              minLength={10}
              maxLength={2000}
              value={draft.reason}
              onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
            />
          </label>
        </div>
        <button className={s.primary}>{t("Отправить запрос владельцу")}</button>
      </fieldset>
      <ActionStatus action={action} />
    </form>
  );
}

function GrantCard({
  grant,
  operator,
  onSaved,
  onOpen,
}: {
  grant: Grant;
  operator: boolean;
  onSaved: () => Promise<void>;
  onOpen: () => void;
}) {
  const { t } = useLocale(),
    action = useTeamAction();
  const [hours, setHours] = useState(Math.min(1, grant.requested_hours));
  const [comment, setComment] = useState("");
  const decision = (value: "approved" | "rejected") =>
    void action.run(
      async () => {
        await api.post(`/support/grants/${grant.id}/decision`, {
          expected_revision: grant.revision,
          decision: value,
          hours,
          comment,
        });
        await onSaved();
      },
      t(
        value === "approved"
          ? "Доступ разрешён на указанный срок"
          : "Запрос отклонён",
      ),
    );
  return (
    <article className={s.card}>
      <div className={s.spread}>
        <h3>
          {grant.organization_name} ·{" "}
          {t(grant.scope_type === "course" ? "Курс" : "Назначение")}{" "}
          {grant.scope_id}
        </h3>
        <span className={s.badge}>{t(labels[grant.status])}</span>
      </div>
      <p>
        {t("Оператор:")} {grant.operator_name}
      </p>
      <p style={{ whiteSpace: "pre-wrap" }}>{grant.reason}</p>
      <p className={s.caption}>
        {t("Запрошено часов:")} {grant.requested_hours} ·{" "}
        {dateLabel(grant.created_at)}
        {grant.expires_at && (
          <>
            {" "}
            · {t("Доступ до:")} {dateLabel(grant.expires_at)}
          </>
        )}
      </p>
      {grant.decision_comment && <p>{grant.decision_comment}</p>}
      {!operator && grant.status === "pending" && (
        <fieldset
          disabled={action.busy}
          style={{ border: 0, padding: 0, margin: 0 }}
        >
          <p>
            {t(
              grant.scope_type === "course"
                ? "Будут доступны тексты уроков, иллюстрации и условия заданий этого курса. Ключи ответов скрыты."
                : "Будут доступны учебные материалы, ответы и результаты только этого назначения. Другие участники и ключи ответов недоступны.",
            )}
          </p>
          <div className={s.formGrid}>
            <label className={s.field}>
              {t("Разрешить на часов")}
              <input
                type="number"
                min={1}
                max={grant.requested_hours}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              />
            </label>
            <label className={s.field}>
              {t("Комментарий к решению")}
              <textarea
                maxLength={2000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>
          </div>
          <div className={s.row}>
            <button
              className={s.primary}
              disabled={
                !Number.isInteger(hours) ||
                hours < 1 ||
                hours > grant.requested_hours
              }
              onClick={() => decision("approved")}
            >
              {t("Разрешить чтение")}
            </button>
            <button
              className={s.secondary}
              onClick={() => decision("rejected")}
            >
              {t("Отклонить запрос")}
            </button>
          </div>
        </fieldset>
      )}
      <div className={s.row}>
        {operator && grant.status === "approved" && (
          <button className={s.primary} onClick={onOpen}>
            {t("Открыть разрешённые данные")}
          </button>
        )}
        {(grant.status === "approved" || grant.status === "pending") && (
          <button
            className={s.secondary}
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                await api.post(`/support/grants/${grant.id}/revoke`, {
                  expected_revision: grant.revision,
                });
                await onSaved();
              }, t("Доступ отозван"))
            }
          >
            {t(operator ? "Закрыть запрос и доступ" : "Отозвать доступ")}
          </button>
        )}
      </div>
      <ActionStatus action={action} />
    </article>
  );
}

function SupportPreview({
  grantId,
  onClose,
}: {
  grantId: number;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const query = useLearningData<SupportContent>(
    `/support/grants/${grantId}/content`,
  );
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!query.data?.grant.expires_at) return;
    const raw = query.data.grant.expires_at;
    const remaining =
      Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(raw) ? raw : raw + "Z") -
      Date.now();
    if (remaining <= 0) {
      setExpired(true);
      return;
    }
    const timer = window.setTimeout(() => setExpired(true), remaining);
    return () => window.clearTimeout(timer);
  }, [query.data?.grant.expires_at]);
  const content = (value: string) =>
    value.replace(
      /\/api\/images\/(\d+)\/content/g,
      `/api/support/grants/${grantId}/images/$1/content`,
    );
  return (
    <section className={s.stack}>
      <div className={s.spread}>
        <h2>{t("Просмотр для поддержки")}</h2>
        <button className={s.secondary} onClick={onClose}>
          {t("Закрыть")}
        </button>
      </div>
      {!!query.error && (
        <RequestError error={query.error} onRetry={() => void query.reload()} />
      )}
      {query.loading && !query.data && (
        <LoadingState>
          {t("Проверяем разрешение и загружаем данные…")}
        </LoadingState>
      )}
      {expired ? (
        <p className={s.notice}>
          {t(
            "Срок разрешения истёк. Для нового просмотра нужен новый запрос владельцу.",
          )}
        </p>
      ) : (
        query.data &&
        !query.error && (
          <>
            <p className={s.notice}>
              {t("Только чтение. Этот просмотр записан в журнал организации.")}
            </p>
            {query.data.content.modules.map((module) => (
              <article className={s.article} key={module.id}>
                <h2>{module.title}</h2>
                {module.lessons.map((lesson) => (
                  <section key={lesson.id}>
                    <h3>{lesson.title}</h3>
                    <MarkdownContent>{content(lesson.content)}</MarkdownContent>
                  </section>
                ))}
                {module.assessments.map((item) => (
                  <section key={item.id}>
                    <h3>{item.question}</h3>
                    <MarkdownContent>{item.description}</MarkdownContent>
                    <p>
                      {t("Максимум баллов:")} {item.max_points}
                    </p>
                  </section>
                ))}
              </article>
            ))}
            {query.data.content.assessments.map((item) => (
              <article className={s.article} key={item.id}>
                <h3>{item.question}</h3>
                <MarkdownContent>{item.description}</MarkdownContent>
              </article>
            ))}
            {query.data.responses.map((response) => (
              <article className={s.card} key={response.id}>
                <h3>
                  {response.assessment_id} · {t("Попытка")} {response.attempt}
                </h3>
                {response.answer.text && (
                  <MarkdownContent>{response.answer.text}</MarkdownContent>
                )}
                {response.answer.selected && (
                  <ul>
                    {response.answer.selected.map((value, i) => (
                      <li key={i}>{value}</li>
                    ))}
                  </ul>
                )}
                <p>
                  {t("Баллы")}: {response.points ?? "—"}
                </p>
                <p>{response.feedback}</p>
              </article>
            ))}
          </>
        )
      )}
    </section>
  );
}
