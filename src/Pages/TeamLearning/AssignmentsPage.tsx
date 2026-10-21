import AssignmentRules, { type RuleOverrides } from "./AssignmentRules";
import { useRoleNames } from "./useRoleNames";
import { useLocale } from "@/i18n/useLocale";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/shared/api";
import { useDurableState } from "@/hooks/useDurableState";
import { Shell } from "@/Pages/Workspace/shared";
import { LoadingState, RequestError } from "@/Components/RequestState";
import DraftNotice from "@/Components/DraftNotice";
import { useLearningData } from "../Learning/useLearningData";
import { type Assignment, dateLabel, stateLabel } from "../Learning/types";
import type { CatalogueItem, Group, Person, Team, TeamSettings } from "./types";
import { initials } from "./types";
import { ActionStatus, TeamTabs, useTeamAction } from "./TeamTools";
import s from "../Learning/learning.module.css";

export default function AssignmentsPage() {
  const roleName = useRoleNames();

  const { t } = useLocale();

  const [params] = useSearchParams();
  const preferredCourse = Number(params.get("course") || 0),
    preferredUser = Number(params.get("user") || 0);
  const catalogue = useLearningData<{ items: CatalogueItem[] }>(
    "/team/catalogue",
  );
  const team = useLearningData<Team>("/team");
  const settings = useLearningData<TeamSettings>("/team/settings");
  const groups = useLearningData<{ items: Group[] }>("/team/groups");
  const people = useLearningData<{ items: Person[] }>("/team/people");
  const [draft, setDraft, clear] = useDurableState(
    `assignments:${preferredCourse}:${preferredUser}`,
    {
      versionId: 0,
      users: preferredUser ? [preferredUser] : [],
      groups: [] as number[],
      due: "",
      future: false,
      cycleKey: "initial",
      overrides: {} as RuleOverrides,
    },
  );
  const selected = draft.versionId
    ? catalogue.data?.items.find((v) => v.course_version_id === draft.versionId)
    : preferredCourse
      ? catalogue.data?.items.find((v) => v.course_id === preferredCourse)
      : catalogue.data?.items[0];
  const assignments = useLearningData<{ items: Assignment[] }>(
    selected ? `/courses/${selected.course_id}/assignments` : null,
  );
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("people");
  const [confirmRevoke, setConfirmRevoke] = useState<number | null>(null);
  const action = useTeamAction();
  const submit = async () => {
    if (!selected || !settings.data || action.busy) return;
    const rulesRevision = settings.data.revision;
    const ok = await action.run(async () => {
      const response = await api.post<{ created: number; items: Assignment[] }>(
        `/courses/${selected.course_id}/assignments`,
        {
          user_ids: draft.users,
          group_ids: draft.groups,
          course_version_id: selected.course_version_id,
          due_at: draft.due ? new Date(draft.due).toISOString() : null,
          include_future_members: draft.future,
          cycle_key: draft.cycleKey,
          expected_rules_revision: rulesRevision,
          rule_overrides: draft.overrides ?? {},
        },
      );
      await assignments.reload();
      return response.data;
    }, t("Назначение подтверждено. Участники увидят курс в «Моём обучении». Повторный запрос не создаёт дубль."));
    if (ok) clear(draft);
  };
  const members =
    team.data?.members.filter(
      (m) =>
        m.is_active &&
        `${m.full_name} ${m.email} ${people.data?.items.find((p) => p.user_id === m.id)?.position ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) ?? [];
  const toggle = (field: "users" | "groups", id: number) =>
    setDraft({
      ...draft,
      [field]: draft[field].includes(id)
        ? draft[field].filter((v) => v !== id)
        : [...draft[field], id],
    });
  return (
    <Shell
      title={t("Назначить обучение")}
      description={t(
        "Выберите опубликованную версию курса, участников и срок. Старые результаты сохраняются.",
      )}
    >
      <div className={s.page}>
        <TeamTabs />
        {!!settings.error && (
          <RequestError
            error={settings.error}
            onRetry={() => void settings.reload()}
          />
        )}
        {!!catalogue.error && (
          <RequestError
            error={catalogue.error}
            onRetry={() => void catalogue.reload()}
          />
        )}{" "}
        {!!team.error && (
          <RequestError error={team.error} onRetry={() => void team.reload()} />
        )}{" "}
        {!!groups.error && (
          <RequestError
            error={groups.error}
            onRetry={() => void groups.reload()}
          />
        )}{" "}
        {!!people.error && (
          <RequestError
            error={people.error}
            onRetry={() => void people.reload()}
          />
        )}
        {catalogue.data && !!catalogue.data.items.length && !selected && (
          <section className={s.conflict}>
            <h2>{t("Выбранная версия курса недоступна")}</h2>
            <p>
              {t(
                "Черновик назначения сохранён. Выберите доступную опубликованную версию перед отправкой.",
              )}
            </p>
            <label className={s.field}>
              {t("Доступные версии")}
              <select
                value=""
                onChange={(e) =>
                  setDraft({ ...draft, versionId: Number(e.target.value) })
                }
              >
                <option value="">{t("Выберите версию…")}</option>
                {catalogue.data.items.map((v) => (
                  <option key={v.course_version_id} value={v.course_version_id}>
                    {v.title}
                    {" " + t("· версия") + " "}
                    {v.revision}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}
        {!catalogue.data && catalogue.loading && (
          <LoadingState>
            {t("Загружаем каталог опубликованных курсов…")}
          </LoadingState>
        )}
        {catalogue.data && !catalogue.data.items.length ? (
          <section className={s.empty}>
            <h2>{t("Нет доступных опубликованных курсов")}</h2>
            <p>
              {t(
                "Автор должен опубликовать полную версию курса. Руководителю также нужно разрешение на этот курс.",
              )}
            </p>
            <Link className={s.primary} to="/courses">
              {t("Открыть курсы")}
            </Link>
          </section>
        ) : (
          selected && (
            <>
              <section className={s.card}>
                <div className={s.formGrid}>
                  <label className={s.field}>
                    {t("Курс и зафиксированная версия")}
                    <select
                      value={selected.course_version_id}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          versionId: Number(e.target.value),
                        })
                      }
                    >
                      {catalogue.data?.items.map((v) => (
                        <option
                          value={v.course_version_id}
                          key={v.course_version_id}
                        >
                          {v.title}
                          {" " + t("· версия") + " "}
                          {v.revision}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={s.field}>
                    {t("Срок прохождения")}
                    <input
                      type="datetime-local"
                      value={draft.due}
                      onChange={(e) =>
                        setDraft({ ...draft, due: e.target.value })
                      }
                    />
                  </label>
                </div>
                <p className={s.muted}>
                  {t("Опубликовано:") + " "}
                  {dateLabel(selected.published_at)}
                  {t(
                    ". Назначенный снимок не изменится после редактирования курса.",
                  )}
                </p>
                <details>
                  <summary>{t("Повторное назначение")}</summary>
                  <p className={s.muted}>
                    {t(
                      "Обычное назначение не дублируется. Для отдельного нового цикла создайте идентификатор; прежние результаты останутся в истории.",
                    )}
                  </p>
                  <div className={s.row}>
                    <code>
                      {draft.cycleKey === "initial"
                        ? t("Первичное обучение")
                        : draft.cycleKey}
                    </code>
                    <button
                      className={s.secondary}
                      onClick={() =>
                        setDraft({ ...draft, cycleKey: crypto.randomUUID() })
                      }
                    >
                      {t("Начать новый цикл назначения")}
                    </button>
                    {draft.cycleKey !== "initial" && (
                      <button
                        className={s.secondary}
                        onClick={() =>
                          setDraft({ ...draft, cycleKey: "initial" })
                        }
                      >
                        {t("Вернуть первичное назначение")}
                      </button>
                    )}
                  </div>
                </details>
              </section>
              {settings.data && (
                <AssignmentRules
                  settings={settings.data}
                  value={draft.overrides ?? {}}
                  onChange={(overrides) => setDraft({ ...draft, overrides })}
                  disabled={action.busy}
                />
              )}
              <section className={s.card} style={{ marginTop: 24 }}>
                <label className={s.field}>
                  {t("Поиск сотрудника или должности")}
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("Имя, email или должность…")}
                  />
                </label>
                <div className={s.tablist} style={{ marginTop: 20 }}>
                  <button
                    aria-selected={tab === "people"}
                    onClick={() => setTab("people")}
                  >
                    {t("Участники ·") + " "}
                    {draft.users.length}
                    {" " + t("выбрано")}
                  </button>
                  <button
                    aria-selected={tab === "groups"}
                    onClick={() => setTab("groups")}
                  >
                    {t("Группы ·") + " "}
                    {draft.groups.length}
                    {" " + t("выбрано")}
                  </button>
                </div>
                {tab === "people" ? (
                  <div className={s.grid}>
                    {members.map((m) => {
                      const person = people.data?.items.find(
                        (p) => p.user_id === m.id,
                      );
                      return (
                        <label
                          className={s.person}
                          key={m.id}
                          aria-checked={draft.users.includes(m.id)}
                        >
                          <input
                            type="checkbox"
                            checked={draft.users.includes(m.id)}
                            onChange={() => toggle("users", m.id)}
                          />
                          <span className={s.avatar}>
                            {initials(m.full_name || m.email)}
                          </span>
                          <h3>{m.full_name || m.email}</h3>
                          <p className={s.accent}>
                            {person?.position ||
                              roleName(m.organization_role) ||
                              t("Участник")}
                          </p>
                          <span className={s.muted}>{m.email}</span>
                        </label>
                      );
                    })}
                    {!members.length && (
                      <p className={s.empty}>
                        {t("Участники по этому запросу не найдены.")}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className={s.grid}>
                      {groups.data?.items
                        .filter((g) =>
                          g.name.toLowerCase().includes(search.toLowerCase()),
                        )
                        .map((g) => (
                          <label
                            className={s.person}
                            key={g.id}
                            aria-checked={draft.groups.includes(g.id)}
                          >
                            <input
                              type="checkbox"
                              checked={draft.groups.includes(g.id)}
                              onChange={() => toggle("groups", g.id)}
                            />
                            <span className={s.avatar}>
                              {g.user_ids.length}
                            </span>
                            <h3>{g.name}</h3>
                            <p>{g.description}</p>
                          </label>
                        ))}
                    </div>
                    <label className={s.check} style={{ marginTop: 24 }}>
                      <input
                        type="checkbox"
                        checked={draft.future}
                        onChange={(e) =>
                          setDraft({ ...draft, future: e.target.checked })
                        }
                      />
                      {t(
                        "Назначать эту же версию новым участникам выбранных групп. Срок остаётся общим для группы.",
                      )}
                    </label>
                  </>
                )}
                {(draft.users.length > 0 || draft.groups.length > 0) && (
                  <DraftNotice />
                )}
                <ActionStatus action={action} />
                {!!action.error && (
                  <button
                    className={s.secondary}
                    onClick={() => void settings.reload()}
                  >
                    {t("Обновить правила организации")}
                  </button>
                )}
                <div className={s.stickyActions}>
                  <button
                    className={s.primary}
                    disabled={
                      action.busy ||
                      !settings.data ||
                      Object.keys(draft.overrides ?? {}).some(
                        (key) =>
                          !settings.data?.rules.assignment_overrides.includes(
                            key,
                          ),
                      ) ||
                      (!draft.users.length && !draft.groups.length)
                    }
                    onClick={() => void submit()}
                  >
                    {action.busy
                      ? t("Назначаем…")
                      : t("Подтвердить назначение →")}
                  </button>
                </div>
              </section>
              <section className={s.card} style={{ marginTop: 24 }}>
                <h2>{t("Назначения этого курса")}</h2>
                {!!assignments.error && (
                  <RequestError
                    error={assignments.error}
                    onRetry={() => void assignments.reload()}
                  />
                )}{" "}
                {assignments.loading && !assignments.data && <LoadingState />}
                {assignments.data && !assignments.data.items.length && (
                  <p className={s.muted}>
                    {t("Пока никому не назначен в вашей области доступа.")}
                  </p>
                )}
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>{t("Участник")}</th>
                        <th>{t("Версия")}</th>
                        <th>{t("Статус")}</th>
                        <th>{t("Срок")}</th>
                        <th>{t("Действие")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.data?.items.map((a) => (
                        <tr key={a.id}>
                          <td>
                            {team.data?.members.find((m) => m.id === a.user_id)
                              ?.full_name ||
                              t("Участник {v0}", { v0: a.user_id })}
                          </td>
                          <td>{a.revision}</td>
                          <td>
                            {t(stateLabel[a.status] ?? String(a.status)) ??
                              a.status}
                          </td>
                          <td>{dateLabel(a.due_at)}</td>
                          <td>
                            {a.state === "active" && (
                              <button
                                className={s.secondary}
                                onClick={() => setConfirmRevoke(a.id)}
                              >
                                {t("Отозвать доступ")}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {confirmRevoke && (
                  <div className={s.conflict}>
                    <p>
                      {t(
                        "Отозвать доступ к этому назначению? Ответы, оценки и история останутся.",
                      )}
                    </p>
                    <div className={s.row}>
                      <button
                        className={s.danger}
                        disabled={action.busy}
                        onClick={() =>
                          void action.run(async () => {
                            await api.delete(
                              `/learning/assignments/${confirmRevoke}`,
                            );
                            setConfirmRevoke(null);
                            await assignments.reload();
                          }, t("Доступ к назначению отозван; результаты сохранены."))
                        }
                      >
                        {t("Отозвать назначение")}
                      </button>
                      <button
                        className={s.secondary}
                        onClick={() => setConfirmRevoke(null)}
                      >
                        {t("Оставить")}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </>
          )
        )}
      </div>
    </Shell>
  );
}
