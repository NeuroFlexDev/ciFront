import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/shared/api";
import { ApiError } from "@/shared/errors";
import { useAuth } from "@/auth/useAuth";
import { useDurableState } from "@/hooks/useDurableState";
import { Shell } from "@/Pages/Workspace/shared";
import { LoadingState, RequestError } from "@/Components/RequestState";
import { useLearningData } from "../Learning/useLearningData";
import { dateLabel } from "../Learning/types";
import { ActionStatus, TeamTabs, useTeamAction } from "./TeamTools";
import { type Team, type TeamSettings, roles } from "./types";
import s from "../Learning/learning.module.css";

type Permission = { can_manage_team: boolean; can_manage_admins: boolean };
export default function TeamSettingsPage() {
  const settings = useLearningData<TeamSettings>("/team/settings");
  const permission = useLearningData<Permission>("/team/permissions");
  return (
    <Shell
      title="Настройки обучения"
      description="Правила организации, её учебный контекст и управление владением."
    >
      <div className={s.page}>
        <TeamTabs />
        {!!settings.error && (
          <RequestError
            error={settings.error}
            onRetry={() => void settings.reload()}
          />
        )}{" "}
        {!!permission.error && (
          <RequestError
            error={permission.error}
            onRetry={() => void permission.reload()}
          />
        )}{" "}
        {settings.loading && !settings.data ? (
          <LoadingState>Загружаем правила обучения…</LoadingState>
        ) : (
          settings.data && (
            <SettingsForm
              settings={settings.data}
              canManage={!!permission.data?.can_manage_team}
              reload={settings.reload}
            />
          )
        )}
        <Ownership isOwner={!!permission.data?.can_manage_admins} />
        {permission.data?.can_manage_team && <Audit />}
      </div>
    </Shell>
  );
}

const profileLabels: Record<string, string> = {
  business: "Компания",
  education: "Образовательная организация",
  training_center: "Учебный центр",
  government: "Государственная организация",
  individual: "Индивидуальное обучение",
};
const boolRules = {
  require_all_lessons: "Для завершения нужно прочитать все уроки",
  require_all_assessments: "Для завершения нужны все задания",
  allow_late_submission: "Разрешить сдавать после срока",
  allow_ai_assistant: "Разрешить помощника по курсу",
  allow_ai_grading: "Разрешить предложения оценки от AI",
  require_independent_approval:
    "Требовать независимое согласование перед публикацией",
} as const;
const overrideNames: Record<string, string> = {
  max_attempts: "Число попыток",
  pass_percent: "Проходной результат",
  allow_late_submission: "Сдача после срока",
  reveal_answers: "Открытие правильных ответов",
};

function SettingsForm({
  settings,
  canManage,
  reload,
}: {
  settings: TeamSettings;
  canManage: boolean;
  reload: () => Promise<void>;
}) {
  const initial = {
    expected_revision: settings.revision,
    profile: settings.profile,
    languages: settings.languages,
    role_labels: settings.role_labels,
    rules: settings.rules,
    ai_context: settings.ai_context,
  };
  const [draft, setDraft, clear] = useDurableState(
    `learning-settings:${settings.organization_id}`,
    initial,
  );
  const action = useTeamAction();
  const conflict = draft.expected_revision !== settings.revision;
  return (
    <form
      className={s.stack}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          try {
            const r = await api.put<TeamSettings>("/team/settings", draft);
            clear(draft);
            const clean = { ...draft, expected_revision: r.data.revision };
            setDraft(clean);
            clear(clean);
            await reload();
          } catch (e) {
            if (e instanceof ApiError && e.status === 409) await reload();
            throw e;
          }
        }, "Настройки сохранены. Уже выданные назначения используют зафиксированные правила.");
      }}
    >
      {conflict && (
        <section className={s.conflict}>
          <h3>Настройки изменились</h3>
          <p>
            Ваш черновик относится к редакции {draft.expected_revision}. На
            сервере редакция {settings.revision}.
          </p>
          <details>
            <summary>Сравнить текущие настройки сервера</summary>
            <pre>{JSON.stringify(initial, null, 2)}</pre>
          </details>
          <div className={s.row}>
            <button
              type="button"
              className={s.secondary}
              onClick={() => setDraft(initial)}
            >
              Взять настройки сервера
            </button>
            <button
              type="button"
              className={s.secondary}
              disabled={!canManage}
              onClick={() =>
                setDraft({ ...draft, expected_revision: settings.revision })
              }
            >
              Применить мои после сравнения
            </button>
          </div>
        </section>
      )}
      <section className={s.card}>
        <h2>Профиль организации</h2>
        <div className={s.formGrid}>
          <label className={s.field}>
            Тип учебной среды
            <select
              disabled={!canManage}
              value={draft.profile}
              onChange={(e) => setDraft({ ...draft, profile: e.target.value })}
            >
              {Object.entries(profileLabels).map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className={s.field}>
            <span>Языки материалов и приглашений</span>
            {[
              ["ru", "Русский"],
              ["en", "English"],
            ].map(([code, label]) => (
              <label className={s.check} key={code}>
                <input
                  type="checkbox"
                  disabled={
                    !canManage ||
                    (draft.languages.length === 1 &&
                      draft.languages.includes(code))
                  }
                  checked={draft.languages.includes(code)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      languages: e.target.checked
                        ? [...draft.languages, code]
                        : draft.languages.filter((l) => l !== code),
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <h3>Названия ролей в вашей организации</h3>
        <div className={s.formGrid}>
          {Object.entries(roles).map(([key, title]) => (
            <label key={key} className={s.field}>
              {title}
              <input
                disabled={!canManage}
                maxLength={100}
                value={draft.role_labels[key] ?? ""}
                placeholder={title}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    role_labels: {
                      ...draft.role_labels,
                      [key]: e.target.value,
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      </section>
      <section className={s.card}>
        <h2>Правила новых назначений</h2>
        <p className={s.muted}>
          При назначении участник получает конкретную опубликованную версию и
          копию правил. Изменение этих настроек не меняет его уже начатую
          попытку.
        </p>
        <div className={s.formGrid}>
          <label className={s.field}>
            Максимум попыток
            <input
              disabled={!canManage}
              type="number"
              required
              min={1}
              max={100}
              value={draft.rules.max_attempts}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  rules: {
                    ...draft.rules,
                    max_attempts: Number(e.target.value),
                  },
                })
              }
            />
          </label>
          <label className={s.field}>
            Проходной результат, %
            <input
              disabled={!canManage}
              type="number"
              required
              min={0}
              max={100}
              step="0.1"
              value={draft.rules.pass_percent}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  rules: {
                    ...draft.rules,
                    pass_percent: Number(e.target.value),
                  },
                })
              }
            />
          </label>
          <label className={s.field}>
            Когда показывать правильные ответы
            <select
              disabled={!canManage}
              value={draft.rules.reveal_answers}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  rules: {
                    ...draft.rules,
                    reveal_answers: e.target
                      .value as typeof draft.rules.reveal_answers,
                  },
                })
              }
            >
              <option value="never">Не показывать</option>
              <option value="after_pass">
                После достижения проходного результата
              </option>
              <option value="after_final_attempt">
                После последней попытки
              </option>
            </select>
          </label>
        </div>
        <div className={s.stack} style={{ marginTop: 24 }}>
          {Object.entries(boolRules).map(([raw, label]) => {
            const key = raw as keyof typeof boolRules;
            const unavailable =
              (key === "allow_ai_grading" && !settings.features.ai_grading) ||
              (key === "allow_ai_assistant" &&
                settings.features.assistant === false);
            return (
              <label key={key} className={s.check}>
                <input
                  disabled={!canManage || unavailable}
                  type="checkbox"
                  checked={draft.rules[key]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      rules: { ...draft.rules, [key]: e.target.checked },
                    })
                  }
                />
                <span>
                  {label}
                  {unavailable && (
                    <small className={s.caption}>
                      {" "}
                      · Функция не включена в поставку
                    </small>
                  )}
                </span>
              </label>
            );
          })}
        </div>
        <h3>Что разрешено менять в отдельном назначении</h3>
        <div className={s.formGrid}>
          {Object.entries(overrideNames).map(([key, title]) => (
            <label key={key} className={s.check}>
              <input
                type="checkbox"
                disabled={!canManage}
                checked={draft.rules.assignment_overrides.includes(key)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    rules: {
                      ...draft.rules,
                      assignment_overrides: e.target.checked
                        ? [...draft.rules.assignment_overrides, key]
                        : draft.rules.assignment_overrides.filter(
                            (v) => v !== key,
                          ),
                    },
                  })
                }
              />
              {title}
            </label>
          ))}
        </div>
      </section>
      <section className={s.card}>
        <h2>Учебный контекст для AI</h2>
        <p className={s.muted}>
          Контекст организации помогает учитывать аудиторию и терминологию при
          работе с материалами. Он не заменяет критерии оценки.
        </p>
        <div className={s.stack}>
          {[
            ["audience", "Кого обучаем"],
            ["terminology", "Терминология и стиль"],
            ["goals", "Учебные цели"],
            ["constraints", "Требования к содержанию"],
          ].map(([key, label]) => (
            <label key={key} className={s.field}>
              {label}
              <textarea
                disabled={!canManage}
                maxLength={2000}
                value={draft.ai_context[key] ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    ai_context: { ...draft.ai_context, [key]: e.target.value },
                  })
                }
              />
            </label>
          ))}
        </div>
      </section>
      <ActionStatus action={action} />
      {canManage ? (
        <button className={s.primary} disabled={action.busy || conflict}>
          Сохранить настройки
        </button>
      ) : (
        <p className={s.notice}>
          Вы видите действующие правила. Изменить их может администратор
          организации.
        </p>
      )}
    </form>
  );
}

type Transfer = {
  id: number;
  from_user_id: number;
  to_user_id: number;
  expires_at: string;
};
function Ownership({ isOwner }: { isOwner: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const team = useLearningData<Team>(isOwner ? "/team" : null);
  const transfers = useLearningData<{ items: Transfer[] }>(
    "/team/ownership-transfers",
  );
  const [target, setTarget] = useState(params.get("user") ?? "");
  const action = useTeamAction();
  return (
    <section className={s.card} style={{ marginTop: 28 }}>
      <h2>Владение организацией</h2>
      <p className={s.muted}>
        Передача завершается после подтверждения выбранным участником из его
        аккаунта. После принятия оба участника входят заново.
      </p>
      {isOwner && (
        <form
          className={s.inlineForm}
          onSubmit={(e) => {
            e.preventDefault();
            if (
              confirm(
                "Предложить передачу владения выбранному участнику? До его принятия вы остаётесь владельцем.",
              )
            )
              void action.run(async () => {
                await api.post("/team/ownership-transfers", {
                  user_id: Number(target),
                });
                await transfers.reload();
              }, "Предложение создано. Получатель подтвердит его в настройках своего аккаунта.");
          }}
        >
          <label className={s.field}>
            Новый владелец
            <select
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Выберите участника</option>
              {team.data?.members
                .filter((m) => m.id !== user?.id && m.is_active)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
            </select>
          </label>
          <button className={s.secondary} disabled={action.busy || !target}>
            Предложить передачу
          </button>
        </form>
      )}
      {!!team.error && (
        <RequestError error={team.error} onRetry={() => void team.reload()} />
      )}{" "}
      {!!transfers.error && (
        <RequestError
          error={transfers.error}
          onRetry={() => void transfers.reload()}
        />
      )}{" "}
      {transfers.data?.items.map((t) => (
        <section className={s.notice} key={t.id}>
          <p>
            {t.to_user_id === user?.id
              ? "Вам предложено принять владение организацией."
              : `Ожидается подтверждение участника ${team.data?.members.find((m) => m.id === t.to_user_id)?.full_name || t.to_user_id}.`}
          </p>
          <p className={s.caption}>Действует до {dateLabel(t.expires_at)}</p>
          <div className={s.row}>
            {t.to_user_id === user?.id && (
              <button
                className={s.primary}
                disabled={action.busy}
                onClick={() => {
                  if (
                    confirm(
                      "Принять права владельца? После этого нужно снова войти в свой аккаунт.",
                    )
                  )
                    void action.run(async () => {
                      await api.post(
                        `/team/ownership-transfers/${t.id}/accept`,
                      );
                      logout();
                      navigate("/auth?returnTo=%2Fteam-settings", {
                        replace: true,
                      });
                    });
                }}
              >
                Принять владение
              </button>
            )}
            <button
              className={s.secondary}
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  await api.delete(`/team/ownership-transfers/${t.id}`);
                  await transfers.reload();
                }, "Передача отменена")
              }
            >
              Отменить предложение
            </button>
          </div>
        </section>
      ))}
      {transfers.data && !transfers.data.items.length && (
        <p className={s.muted}>Активных предложений передачи нет.</p>
      )}
      <ActionStatus action={action} />
      <Link className={s.secondary} to="/team">
        Участники и приглашения
      </Link>
    </section>
  );
}

function Audit() {
  const [offset, setOffset] = useState(0);
  const data = useLearningData<{
    total: number;
    items: {
      id: number;
      actor_id: number | null;
      action: string;
      target_type: string;
      target_id: string;
      details: Record<string, unknown>;
      created_at: string;
    }[];
  }>(`/team/audit?limit=30&offset=${offset}`);
  return (
    <section className={s.card} style={{ marginTop: 28 }}>
      <h2>Журнал действий</h2>
      {!!data.error && (
        <RequestError error={data.error} onRetry={() => void data.reload()} />
      )}{" "}
      {data.loading && !data.data && (
        <LoadingState>Загружаем журнал…</LoadingState>
      )}
      <div className={s.history}>
        {data.data?.items.map((e) => (
          <details key={e.id}>
            <summary>
              {dateLabel(e.created_at)} · {e.action}
            </summary>
            <p>
              Инициатор: {e.actor_id ?? "Система"} · {e.target_type}{" "}
              {e.target_id}
            </p>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(e.details, null, 2)}
            </pre>
          </details>
        ))}
      </div>
      {data.data && !data.data.total && (
        <p className={s.muted}>Событий организации пока нет.</p>
      )}
      <div className={s.stickyActions}>
        <button
          className={s.secondary}
          disabled={offset === 0 || data.loading}
          onClick={() => setOffset(Math.max(0, offset - 30))}
        >
          Назад
        </button>
        <span className={s.muted}>
          {data.data?.total
            ? `${offset + 1}–${Math.min(offset + 30, data.data.total)} из ${data.data.total}`
            : "0 событий"}
        </span>
        <button
          className={s.secondary}
          disabled={data.loading || offset + 30 >= (data.data?.total ?? 0)}
          onClick={() => setOffset(offset + 30)}
        >
          Далее
        </button>
      </div>
    </section>
  );
}
