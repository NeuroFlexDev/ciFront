import { useRoleNames } from "./useRoleNames";
import { useLocale } from "@/i18n/useLocale";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, apiFetch } from "@/shared/api";
import { ApiError } from "@/shared/errors";
import { useAuth } from "@/auth/useAuth";
import { useDurableState } from "@/hooks/useDurableState";
import { Shell } from "@/Pages/Workspace/shared";
import { LoadingState, RequestError } from "@/Components/RequestState";
import { useLearningData } from "../Learning/useLearningData";
import { ActionStatus, TeamTabs, useTeamAction } from "./TeamTools";
import {
  type Department,
  type Group,
  type Person,
  type RoleGrant,
  type Team,
  type TeamMember,
  initials,
} from "./types";
import s from "../Learning/learning.module.css";

export default function GroupsPage() {
  const roleName = useRoleNames();

  const { t } = useLocale();

  const team = useLearningData<Team>("/team");
  const groups = useLearningData<{ items: Group[] }>("/team/groups");
  const departments = useLearningData<{ items: Department[] }>(
    "/team/departments",
  );
  const people = useLearningData<{ items: Person[] }>("/team/people");
  const [tab, setTab] = useState("groups");
  const [selected, setSelected] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const exportAction = useTeamAction();
  const exportPeople = () =>
    void exportAction.run(async () => {
      const response = await apiFetch("/team/people/export");
      if (!response.ok)
        throw new ApiError(
          t("Не удалось выгрузить участников"),
          response.status,
          "http",
        );
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "learning-people.csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, t("Список участников выгружен. Выгрузка записана в журнал."));
  const reload = async () => {
    await Promise.all([
      team.reload(),
      groups.reload(),
      departments.reload(),
      people.reload(),
    ]);
  };
  return (
    <Shell
      title={t("Команда и группы")}
      description={t(
        "Состав команды, учебные группы, подразделения и права в конкретной области.",
      )}
    >
      <div className={s.page}>
        <TeamTabs />
        {[team, groups, departments, people].map((r, i) =>
          r.error ? (
            <RequestError
              key={i}
              error={r.error}
              onRetry={() => void r.reload()}
            />
          ) : null,
        )}
        {!team.data && team.loading ? (
          <LoadingState>{t("Загружаем команду…")}</LoadingState>
        ) : (
          team.data && (
            <>
              <div className={s.spread}>
                <div className={s.tablist}>
                  {[
                    ["groups", t("Группы")],
                    ["people", t("Участники")],
                    ["departments", t("Подразделения")],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      aria-selected={tab === key}
                      onClick={() => {
                        setTab(key);
                        setSelected(null);
                      }}
                    >
                      {t(String(label))}
                    </button>
                  ))}
                </div>
                <div className={s.row}>
                  {team.data.can_manage && (
                    <button
                      className={s.secondary}
                      disabled={exportAction.busy}
                      onClick={exportPeople}
                    >
                      {t("Скачать участников CSV ↓")}
                    </button>
                  )}
                  <Link className={s.secondary} to="/team">
                    {t("Пригласить участника")}
                  </Link>
                </div>
              </div>
              <ActionStatus action={exportAction} />
              {tab === "groups" && (
                <div className={s.layout}>
                  <div className={s.stack}>
                    {selected &&
                    groups.data?.items.some((g) => g.id === selected) ? (
                      <GroupForm
                        key={selected}
                        group={groups.data.items.find(
                          (g) => g.id === selected,
                        )!}
                        members={team.data.members}
                        canManage={team.data.can_manage}
                        reload={reload}
                        onArchive={() => setSelected(null)}
                      />
                    ) : team.data.can_manage ? (
                      <GroupCreate reload={reload} onCreated={setSelected} />
                    ) : (
                      <section className={s.empty}>
                        <h2>{t("Выберите группу")}</h2>
                        <p>
                          {t(
                            "Здесь показаны группы, к которым у вас есть доступ.",
                          )}
                        </p>
                      </section>
                    )}
                  </div>
                  <aside className={s.rail}>
                    <label className={s.field}>
                      {t("Поиск группы")}
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    {groups.data?.items
                      .filter((g) =>
                        g.name.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map((g) => (
                        <button
                          className={s.railItem}
                          key={g.id}
                          aria-current={selected === g.id}
                          onClick={() => setSelected(g.id)}
                        >
                          <strong>{g.user_ids.length}</strong>
                          <span>
                            {g.name}
                            <small>
                              {g.staff.length}
                              {" " + t("назначений ответственных")}
                            </small>
                          </span>
                        </button>
                      ))}
                    {!groups.data?.items.length && (
                      <p className={s.muted}>{t("Группы ещё не созданы.")}</p>
                    )}
                    {team.data.can_manage && (
                      <button
                        className={s.secondary}
                        onClick={() => setSelected(null)}
                      >
                        {t("+ Новая группа")}
                      </button>
                    )}
                  </aside>
                </div>
              )}
              {tab === "people" && (
                <>
                  <label className={s.field}>
                    {t("Поиск участника")}
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("Имя или почта")}
                    />
                  </label>
                  <div className={s.grid} style={{ marginTop: 24 }}>
                    {team.data.members
                      .filter((m) =>
                        (m.full_name + " " + m.email)
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((m) => (
                        <article className={s.person} key={m.id}>
                          <div className={s.avatar}>
                            {initials(m.full_name || m.email)}
                          </div>
                          <h3>{m.full_name || m.email}</h3>
                          <p className={s.muted}>{m.email}</p>
                          <p>
                            {people.data?.items.find((p) => p.user_id === m.id)
                              ?.position || roleName(m.organization_role)}
                          </p>
                          <span className={s.badge}>
                            {m.is_active ? t("Активен") : t("Доступ отозван")}
                          </span>
                          <div className={s.row} style={{ marginTop: 18 }}>
                            <button
                              className={s.secondary}
                              onClick={() =>
                                setSelected(selected === m.id ? null : m.id)
                              }
                            >
                              {t("Карточка и права")}
                            </button>
                            <Link
                              className={s.primary}
                              to={`/assignments?user=${m.id}`}
                            >
                              {t("Назначить")}
                            </Link>
                          </div>
                        </article>
                      ))}
                  </div>
                  {selected &&
                    team.data.members.find((m) => m.id === selected) && (
                      <PersonForm
                        key={selected}
                        member={team.data.members.find(
                          (m) => m.id === selected,
                        )!}
                        person={people.data?.items.find(
                          (p) => p.user_id === selected,
                        )}
                        departments={departments.data?.items ?? []}
                        groups={groups.data?.items ?? []}
                        canManage={team.data.can_manage}
                        reload={reload}
                      />
                    )}
                </>
              )}
              {tab === "departments" && (
                <Departments
                  data={departments.data?.items ?? []}
                  canManage={team.data.can_manage}
                  reload={reload}
                />
              )}
            </>
          )
        )}
      </div>
    </Shell>
  );
}

function GroupCreate({
  reload,
  onCreated,
}: {
  reload: () => Promise<void>;
  onCreated: (id: number) => void;
}) {
  const { t } = useLocale();

  const [draft, setDraft, clear] = useDurableState("new-learning-group", {
    name: "",
    description: "",
  });
  const action = useTeamAction();
  return (
    <form
      className={s.card}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          const result = await api.post<Group>("/team/groups", draft);
          clear(draft);
          await reload();
          onCreated(result.data.id);
        }, t("Группа создана"));
      }}
    >
      <h2>{t("Новая группа")}</h2>
      <div className={s.stack}>
        <label className={s.field}>
          {t("Название")}
          <input
            required
            maxLength={200}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label className={s.field}>
          {t("Описание")}
          <textarea
            maxLength={10000}
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
        </label>
        <button
          className={s.primary}
          disabled={action.busy || !draft.name.trim()}
        >
          {t("Создать группу")}
        </button>
        <ActionStatus action={action} />
      </div>
    </form>
  );
}

function GroupForm({
  group,
  members,
  canManage,
  reload,
  onArchive,
}: {
  group: Group;
  members: TeamMember[];
  canManage: boolean;
  reload: () => Promise<void>;
  onArchive: () => void;
}) {
  const roleName = useRoleNames();

  const { t } = useLocale();

  const [draft, setDraft, clear] = useDurableState(
    `learning-group:${group.id}`,
    { name: group.name, description: group.description },
  );
  const [add, setAdd] = useState<number[]>([]);
  const action = useTeamAction();
  return (
    <section className={s.card}>
      <h2>{group.name}</h2>
      <form
        className={s.stack}
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            await api.put(`/team/groups/${group.id}`, draft);
            clear(draft);
            await reload();
          });
        }}
      >
        <label className={s.field}>
          {t("Название")}
          <input
            disabled={!canManage || action.busy}
            required
            maxLength={200}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label className={s.field}>
          {t("Описание")}
          <textarea
            disabled={!canManage || action.busy}
            maxLength={10000}
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
        </label>
        {canManage && (
          <div className={s.row}>
            <button className={s.primary} disabled={action.busy}>
              {t("Сохранить")}
            </button>
            <Link className={s.secondary} to="/assignments">
              {t("Назначить обучение")}
            </Link>
          </div>
        )}
      </form>
      <hr className={s.divider} />
      <h3>
        {t("Состав ·") + " "}
        {group.user_ids.length}
      </h3>
      {group.user_ids.map((uid) => {
        const m = members.find((v) => v.id === uid);
        return (
          <div className={s.spread} key={uid}>
            <p>{m?.full_name || m?.email || t("Участник {v0}", { v0: uid })}</p>
            {canManage && (
              <button
                className={s.secondary}
                disabled={action.busy}
                onClick={() => {
                  if (
                    confirm(
                      t(
                        "Убрать участника из группы? Его ранее назначенные курсы и результаты сохранятся.",
                      ),
                    )
                  )
                    void action.run(async () => {
                      await api.delete(
                        `/team/groups/${group.id}/members/${uid}`,
                      );
                      await reload();
                    }, t("Участник убран из группы. Результаты сохранены."));
                }}
              >
                {t("Убрать")}
              </button>
            )}
          </div>
        );
      })}
      {!group.user_ids.length && (
        <p className={s.muted}>
          {t("Добавьте участников, чтобы назначать обучение всей группе.")}
        </p>
      )}
      {canManage && (
        <details>
          <summary>{t("Добавить участников")}</summary>
          <div className={s.stack}>
            {members
              .filter((m) => m.is_active && !group.user_ids.includes(m.id))
              .map((m) => (
                <label className={s.check} key={m.id}>
                  <input
                    type="checkbox"
                    checked={add.includes(m.id)}
                    onChange={(e) =>
                      setAdd(
                        e.target.checked
                          ? [...add, m.id]
                          : add.filter((id) => id !== m.id),
                      )
                    }
                  />
                  <span>{m.full_name || m.email}</span>
                </label>
              ))}
            <button
              className={s.primary}
              disabled={action.busy || !add.length}
              onClick={() =>
                void action.run(async () => {
                  await api.post(`/team/groups/${group.id}/members`, {
                    user_ids: add,
                  });
                  setAdd([]);
                  await reload();
                }, t("Участники добавлены. Действующие групповые назначения применены."))
              }
            >
              {t("Добавить выбранных")}
            </button>
          </div>
        </details>
      )}
      {!!group.staff.length && (
        <section>
          <h3>{t("Ответственные")}</h3>
          {group.staff.map((g) => (
            <p key={g.id}>
              {members.find((m) => m.id === g.user_id)?.full_name ||
                t("Участник {v0}", { v0: g.user_id })}{" "}
              · {roleName(g.role)}
            </p>
          ))}
          <p className={s.caption}>
            {t("Изменить область ответственности можно в карточке участника.")}
          </p>
        </section>
      )}
      <ActionStatus action={action} />
      {canManage && (
        <button
          className={s.danger}
          style={{ marginTop: 24 }}
          disabled={action.busy}
          onClick={() => {
            if (
              confirm(
                t(
                  "Архивировать группу? Новые участники перестанут получать групповые назначения. История обучения сохраняется.",
                ),
              )
            )
              void action.run(async () => {
                await api.delete(`/team/groups/${group.id}`);
                await reload();
                onArchive();
              }, t("Группа архивирована"));
          }}
        >
          {t("Архивировать группу")}
        </button>
      )}
    </section>
  );
}

function Departments({
  data,
  canManage,
  reload,
}: {
  data: Department[];
  canManage: boolean;
  reload: () => Promise<void>;
}) {
  const { t } = useLocale();

  const [draft, setDraft, clear] = useDurableState("learning-department", {
    id: null as number | null,
    name: "",
    parent_id: "",
  });
  const id = draft.id ?? null;
  const action = useTeamAction();
  return (
    <div className={s.grid}>
      <section className={s.card}>
        <h2>{t("Структура организации")}</h2>
        {data.map((d) => (
          <div className={s.spread} key={d.id}>
            <div>
              <strong>{d.name}</strong>
              {d.parent_id && (
                <p className={s.muted}>
                  {t("В составе:") + " "}
                  {data.find((v) => v.id === d.parent_id)?.name}
                </p>
              )}
            </div>
            {canManage && (
              <div className={s.row}>
                <button
                  className={s.secondary}
                  onClick={() => {
                    setDraft({
                      id: d.id,
                      name: d.name,
                      parent_id: String(d.parent_id ?? ""),
                    });
                  }}
                >
                  {t("Изменить")}
                </button>
                <button
                  className={s.danger}
                  disabled={action.busy}
                  onClick={() => {
                    if (
                      confirm(
                        t(
                          "Архивировать «{v0}»? Сначала перенесите участников и дочерние подразделения.",
                          { v0: d.name },
                        ),
                      )
                    )
                      void action.run(async () => {
                        await api.delete(`/team/departments/${d.id}`);
                        await reload();
                      });
                  }}
                >
                  {t("Архивировать")}
                </button>
              </div>
            )}
          </div>
        ))}
        {!data.length && (
          <p className={s.muted}>{t("Подразделения ещё не добавлены.")}</p>
        )}
      </section>
      {canManage && (
        <form
          className={s.card}
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              const body = {
                name: draft.name,
                parent_id: draft.parent_id ? Number(draft.parent_id) : null,
              };
              if (id) await api.put(`/team/departments/${id}`, body);
              else await api.post("/team/departments", body);
              clear(draft);
              setDraft({ id: null, name: "", parent_id: "" });
              await reload();
            });
          }}
        >
          <h2>{id ? t("Изменить подразделение") : t("Новое подразделение")}</h2>
          <div className={s.stack}>
            <label className={s.field}>
              {t("Название")}
              <input
                required
                maxLength={200}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className={s.field}>
              {t("Входит в подразделение")}
              <select
                value={draft.parent_id}
                onChange={(e) =>
                  setDraft({ ...draft, parent_id: e.target.value })
                }
              >
                <option value="">{t("Корневой уровень")}</option>
                {data
                  .filter((d) => d.id !== id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className={s.row}>
              <button
                className={s.primary}
                disabled={action.busy || !draft.name.trim()}
              >
                {t("Сохранить")}
              </button>
              {id && (
                <button
                  type="button"
                  className={s.secondary}
                  onClick={() => {
                    setDraft({ id: null, name: "", parent_id: "" });
                  }}
                >
                  {t("Новое подразделение")}
                </button>
              )}
            </div>
            <ActionStatus action={action} />
          </div>
        </form>
      )}
    </div>
  );
}

export function PersonForm({
  member,
  person,
  departments,
  groups,
  canManage,
  reload,
}: {
  member: TeamMember;
  person?: Person;
  departments: Department[];
  groups: Group[];
  canManage: boolean;
  reload: () => Promise<void>;
}) {
  const { t } = useLocale();

  const { user } = useAuth();
  const [draft, setDraft, clear] = useDurableState(
    `learning-person:${member.id}`,
    {
      position: person?.position ?? "",
      department_id: person?.department_id ? String(person.department_id) : "",
      external_id: person?.external_id ?? "",
      attributes: person?.attributes ?? {},
      attributeRows: undefined as { key: string; value: string }[] | undefined,
    },
  );
  const action = useTeamAction();
  const attributeRows =
    draft.attributeRows ??
    Object.entries(draft.attributes).map(([key, value]) => ({ key, value }));
  return (
    <section className={s.card} style={{ marginTop: 28 }}>
      <h2>{member.full_name || member.email}</h2>
      <form
        className={s.stack}
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            if (
              attributeRows.some((row) => !row.key.trim()) ||
              new Set(attributeRows.map((row) => row.key.trim())).size !==
                attributeRows.length
            )
              throw new Error(
                t(
                  "Названия дополнительных полей должны быть заполнены и не повторяться.",
                ),
              );
            const { attributeRows: rows, ...payload } = draft;
            void rows;
            await api.put(`/team/people/${member.id}`, {
              ...payload,
              attributes: Object.fromEntries(
                attributeRows.map((row) => [row.key.trim(), row.value]),
              ),
              department_id: draft.department_id
                ? Number(draft.department_id)
                : null,
              external_id: draft.external_id || null,
            });
            clear(draft);
            await reload();
          });
        }}
      >
        <div className={s.formGrid}>
          <label className={s.field}>
            {t("Должность")}
            <input
              disabled={!canManage || action.busy}
              maxLength={200}
              value={draft.position}
              onChange={(e) => setDraft({ ...draft, position: e.target.value })}
            />
          </label>
          <label className={s.field}>
            {t("Подразделение")}
            <select
              disabled={!canManage || action.busy}
              value={draft.department_id}
              onChange={(e) =>
                setDraft({ ...draft, department_id: e.target.value })
              }
            >
              <option value="">{t("Не указано")}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            {t("Идентификатор в организации")}
            <input
              disabled={!canManage || action.busy}
              maxLength={200}
              value={draft.external_id}
              onChange={(e) =>
                setDraft({ ...draft, external_id: e.target.value })
              }
            />
          </label>
        </div>
        <fieldset
          disabled={!canManage || action.busy}
          style={{ border: 0, padding: 0, margin: 0 }}
        >
          <legend>{t("Дополнительные учебные атрибуты")}</legend>
          <p className={s.muted}>
            {t(
              "Например: направление подготовки, квалификация или рабочая площадка. Эти поля не изменяют права доступа.",
            )}
          </p>
          {attributeRows.map((row, index) => (
            <div className={s.formGrid} key={index}>
              <label className={s.field}>
                {t("Название поля")}
                <input
                  required
                  maxLength={80}
                  value={row.key}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      attributeRows: attributeRows.map((item, i) =>
                        i === index
                          ? { ...item, key: event.target.value }
                          : item,
                      ),
                    })
                  }
                />
              </label>
              <label className={s.field}>
                {t("Значение")}
                <input
                  maxLength={2000}
                  value={row.value}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      attributeRows: attributeRows.map((item, i) =>
                        i === index
                          ? { ...item, value: event.target.value }
                          : item,
                      ),
                    })
                  }
                />
              </label>
              {canManage && (
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      attributeRows: attributeRows.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                >
                  {t("Удалить поле")} {index + 1}
                </button>
              )}
            </div>
          ))}
          {canManage && (
            <button
              type="button"
              className={s.secondary}
              disabled={attributeRows.length >= 50}
              onClick={() =>
                setDraft({
                  ...draft,
                  attributeRows: [...attributeRows, { key: "", value: "" }],
                })
              }
            >
              {t("Добавить поле")}
            </button>
          )}
        </fieldset>
        {canManage && (
          <button className={s.primary} disabled={action.busy}>
            {t("Сохранить карточку")}
          </button>
        )}
        <ActionStatus action={action} />
      </form>
      {canManage && (
        <Roles
          member={member}
          groups={groups}
          departments={departments}
          own={member.id === user?.id}
        />
      )}
    </section>
  );
}

function Roles({
  member,
  groups,
  departments,
  own,
}: {
  member: TeamMember;
  groups: Group[];
  departments: Department[];
  own: boolean;
}) {
  const roleName = useRoleNames();

  const { t } = useLocale();

  const grants = useLearningData<{ role: string; items: RoleGrant[] }>(
    `/team/members/${member.id}/roles`,
  );
  const courses = useLearningData<{
    items: { id: number; title: string; status: string }[];
  }>("/team/course-directory");
  const permission = useLearningData<{ can_manage_admins: boolean }>(
    "/team/permissions",
  );
  const [role, setRole] = useState("author");
  const [scope, setScope] = useState("organization");
  const [scopeId, setScopeId] = useState("");
  const action = useTeamAction();
  const choices =
    scope === "group"
      ? groups.map((g) => ({ id: g.id, title: g.name }))
      : scope === "department"
        ? departments.map((g) => ({ id: g.id, title: g.name }))
        : (courses.data?.items ?? []);
  const scopeLabel = (g: RoleGrant) =>
    g.scope_type === "organization"
      ? t("Вся организация")
      : g.scope_type === "group"
        ? groups.find((v) => v.id === g.scope_id)?.name
        : g.scope_type === "department"
          ? departments.find((v) => v.id === g.scope_id)?.name
          : courses.data?.items.find((v) => v.id === g.scope_id)?.title;
  return (
    <div className={s.stack} style={{ marginTop: 28 }}>
      <h3>{t("Права доступа")}</h3>
      <p className={s.muted}>
        {t("Основная роль:") + " "}
        {roleName(grants.data?.role ?? member.organization_role)}
        {t(
          ". Автор работает с содержанием; проверяющий оценивает работы; руководитель видит результаты в своей области.",
        )}
      </p>
      {!!grants.error && (
        <RequestError
          error={grants.error}
          onRetry={() => void grants.reload()}
        />
      )}{" "}
      {!!courses.error && (
        <RequestError
          error={courses.error}
          onRetry={() => void courses.reload()}
        />
      )}{" "}
      {grants.data?.items.map((g) => (
        <div className={s.spread} key={g.id}>
          <span>
            {roleName(g.role)} ·{" "}
            {scopeLabel(g) || `${g.scope_type} ${g.scope_id}`}
          </span>
          <button
            className={s.danger}
            disabled={
              own ||
              action.busy ||
              (g.role === "admin" && !permission.data?.can_manage_admins)
            }
            onClick={() => {
              if (
                confirm(
                  t(
                    "Отозвать это назначение роли? Сеансы участника будут завершены.",
                  ),
                )
              )
                void action.run(async () => {
                  await api.delete(`/team/members/${member.id}/roles/${g.id}`);
                  await grants.reload();
                }, t("Роль отозвана"));
            }}
          >
            {t("Отозвать")}
          </button>
        </div>
      ))}
      {own ? (
        <p className={s.muted}>
          {t("Собственные права изменяет другой администратор или владелец.")}
        </p>
      ) : (
        <form
          className={s.stack}
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              await api.post(`/team/members/${member.id}/roles`, {
                role,
                scope_type: scope,
                scope_id: scope === "organization" ? 0 : Number(scopeId),
              });
              await grants.reload();
            }, t("Роль назначена"));
          }}
        >
          <div className={s.formGrid}>
            <label className={s.field}>
              {t("Роль")}
              <select
                value={role}
                onChange={(e) => {
                  const next = e.target.value;
                  setRole(next);
                  setScope(
                    next === "admin" || next === "member" || next === "author"
                      ? "organization"
                      : "course",
                  );
                  setScopeId("");
                }}
              >
                {[
                  "author",
                  "reviewer",
                  "manager",
                  "member",
                  ...(permission.data?.can_manage_admins ? ["admin"] : []),
                ].map((r) => (
                  <option key={r} value={r}>
                    {roleName(r)}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              {t("Область")}
              <select
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value);
                  setScopeId("");
                }}
              >
                {(role === "admin" || role === "member"
                  ? ["organization"]
                  : role === "author"
                    ? ["organization", "course"]
                    : ["course", "group", "department"]
                ).map((v) => (
                  <option key={v} value={v}>
                    {
                      {
                        organization: t("Организация"),
                        course: t("Курс"),
                        group: t("Группа"),
                        department: t("Подразделение"),
                      }[v]
                    }
                  </option>
                ))}
              </select>
            </label>
            {scope !== "organization" && (
              <label className={s.field}>
                {t("Выберите область")}
                <select
                  required
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                >
                  <option value="">{t("Выберите…")}</option>
                  {choices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <button
            className={s.primary}
            disabled={
              action.busy ||
              !member.is_active ||
              (scope !== "organization" && !scopeId)
            }
          >
            {t("Назначить роль")}
          </button>
        </form>
      )}
      <ActionStatus action={action} />
    </div>
  );
}
