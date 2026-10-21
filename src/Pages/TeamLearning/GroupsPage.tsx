import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/shared/api";
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
  roles,
} from "./types";
import s from "../Learning/learning.module.css";

export default function GroupsPage() {
  const team = useLearningData<Team>("/team");
  const groups = useLearningData<{ items: Group[] }>("/team/groups");
  const departments = useLearningData<{ items: Department[] }>(
    "/team/departments",
  );
  const people = useLearningData<{ items: Person[] }>("/team/people");
  const [tab, setTab] = useState("groups");
  const [selected, setSelected] = useState<number | null>(null);
  const [query, setQuery] = useState("");
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
      title="Команда и группы"
      description="Состав команды, учебные группы, подразделения и права в конкретной области."
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
          <LoadingState>Загружаем команду…</LoadingState>
        ) : (
          team.data && (
            <>
              <div className={s.spread}>
                <div className={s.tablist}>
                  {[
                    ["groups", "Группы"],
                    ["people", "Участники"],
                    ["departments", "Подразделения"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      aria-selected={tab === key}
                      onClick={() => {
                        setTab(key);
                        setSelected(null);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Link className={s.secondary} to="/team">
                  Пригласить участника
                </Link>
              </div>
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
                        <h2>Выберите группу</h2>
                        <p>
                          Здесь показаны группы, к которым у вас есть доступ.
                        </p>
                      </section>
                    )}
                  </div>
                  <aside className={s.rail}>
                    <label className={s.field}>
                      Поиск группы
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
                              {g.staff.length} назначений ответственных
                            </small>
                          </span>
                        </button>
                      ))}
                    {!groups.data?.items.length && (
                      <p className={s.muted}>Группы ещё не созданы.</p>
                    )}
                    {team.data.can_manage && (
                      <button
                        className={s.secondary}
                        onClick={() => setSelected(null)}
                      >
                        + Новая группа
                      </button>
                    )}
                  </aside>
                </div>
              )}
              {tab === "people" && (
                <>
                  <label className={s.field}>
                    Поиск участника
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Имя или почта"
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
                              ?.position || roles[m.organization_role]}
                          </p>
                          <span className={s.badge}>
                            {m.is_active ? "Активен" : "Доступ отозван"}
                          </span>
                          <div className={s.row} style={{ marginTop: 18 }}>
                            <button
                              className={s.secondary}
                              onClick={() =>
                                setSelected(selected === m.id ? null : m.id)
                              }
                            >
                              Карточка и права
                            </button>
                            <Link
                              className={s.primary}
                              to={`/assignments?user=${m.id}`}
                            >
                              Назначить
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
        }, "Группа создана");
      }}
    >
      <h2>Новая группа</h2>
      <div className={s.stack}>
        <label className={s.field}>
          Название
          <input
            required
            maxLength={200}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label className={s.field}>
          Описание
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
          Создать группу
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
          Название
          <input
            disabled={!canManage || action.busy}
            required
            maxLength={200}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label className={s.field}>
          Описание
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
              Сохранить
            </button>
            <Link className={s.secondary} to="/assignments">
              Назначить обучение
            </Link>
          </div>
        )}
      </form>
      <hr className={s.divider} />
      <h3>Состав · {group.user_ids.length}</h3>
      {group.user_ids.map((uid) => {
        const m = members.find((v) => v.id === uid);
        return (
          <div className={s.spread} key={uid}>
            <p>{m?.full_name || m?.email || `Участник ${uid}`}</p>
            {canManage && (
              <button
                className={s.secondary}
                disabled={action.busy}
                onClick={() => {
                  if (
                    confirm(
                      "Убрать участника из группы? Его ранее назначенные курсы и результаты сохранятся.",
                    )
                  )
                    void action.run(async () => {
                      await api.delete(
                        `/team/groups/${group.id}/members/${uid}`,
                      );
                      await reload();
                    }, "Участник убран из группы. Результаты сохранены.");
                }}
              >
                Убрать
              </button>
            )}
          </div>
        );
      })}
      {!group.user_ids.length && (
        <p className={s.muted}>
          Добавьте участников, чтобы назначать обучение всей группе.
        </p>
      )}
      {canManage && (
        <details>
          <summary>Добавить участников</summary>
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
                }, "Участники добавлены. Действующие групповые назначения применены.")
              }
            >
              Добавить выбранных
            </button>
          </div>
        </details>
      )}
      {!!group.staff.length && (
        <section>
          <h3>Ответственные</h3>
          {group.staff.map((g) => (
            <p key={g.id}>
              {members.find((m) => m.id === g.user_id)?.full_name ||
                `Участник ${g.user_id}`}{" "}
              · {roles[g.role]}
            </p>
          ))}
          <p className={s.caption}>
            Изменить область ответственности можно в карточке участника.
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
                "Архивировать группу? Новые участники перестанут получать групповые назначения. История обучения сохраняется.",
              )
            )
              void action.run(async () => {
                await api.delete(`/team/groups/${group.id}`);
                await reload();
                onArchive();
              }, "Группа архивирована");
          }}
        >
          Архивировать группу
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
        <h2>Структура организации</h2>
        {data.map((d) => (
          <div className={s.spread} key={d.id}>
            <div>
              <strong>{d.name}</strong>
              {d.parent_id && (
                <p className={s.muted}>
                  В составе: {data.find((v) => v.id === d.parent_id)?.name}
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
                  Изменить
                </button>
                <button
                  className={s.danger}
                  disabled={action.busy}
                  onClick={() => {
                    if (
                      confirm(
                        `Архивировать «${d.name}»? Сначала перенесите участников и дочерние подразделения.`,
                      )
                    )
                      void action.run(async () => {
                        await api.delete(`/team/departments/${d.id}`);
                        await reload();
                      });
                  }}
                >
                  Архивировать
                </button>
              </div>
            )}
          </div>
        ))}
        {!data.length && (
          <p className={s.muted}>Подразделения ещё не добавлены.</p>
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
          <h2>{id ? "Изменить подразделение" : "Новое подразделение"}</h2>
          <div className={s.stack}>
            <label className={s.field}>
              Название
              <input
                required
                maxLength={200}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className={s.field}>
              Входит в подразделение
              <select
                value={draft.parent_id}
                onChange={(e) =>
                  setDraft({ ...draft, parent_id: e.target.value })
                }
              >
                <option value="">Корневой уровень</option>
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
                Сохранить
              </button>
              {id && (
                <button
                  type="button"
                  className={s.secondary}
                  onClick={() => {
                    setDraft({ id: null, name: "", parent_id: "" });
                  }}
                >
                  Новое подразделение
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

function PersonForm({
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
  const { user } = useAuth();
  const [draft, setDraft, clear] = useDurableState(
    `learning-person:${member.id}`,
    {
      position: person?.position ?? "",
      department_id: person?.department_id ? String(person.department_id) : "",
      external_id: person?.external_id ?? "",
      attributes: person?.attributes ?? {},
    },
  );
  const action = useTeamAction();
  return (
    <section className={s.card} style={{ marginTop: 28 }}>
      <h2>{member.full_name || member.email}</h2>
      <form
        className={s.stack}
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            await api.put(`/team/people/${member.id}`, {
              ...draft,
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
            Должность
            <input
              disabled={!canManage}
              maxLength={200}
              value={draft.position}
              onChange={(e) => setDraft({ ...draft, position: e.target.value })}
            />
          </label>
          <label className={s.field}>
            Подразделение
            <select
              disabled={!canManage}
              value={draft.department_id}
              onChange={(e) =>
                setDraft({ ...draft, department_id: e.target.value })
              }
            >
              <option value="">Не указано</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            Идентификатор в организации
            <input
              disabled={!canManage}
              maxLength={200}
              value={draft.external_id}
              onChange={(e) =>
                setDraft({ ...draft, external_id: e.target.value })
              }
            />
          </label>
        </div>
        {canManage && (
          <button className={s.primary} disabled={action.busy}>
            Сохранить карточку
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
      ? "Вся организация"
      : g.scope_type === "group"
        ? groups.find((v) => v.id === g.scope_id)?.name
        : g.scope_type === "department"
          ? departments.find((v) => v.id === g.scope_id)?.name
          : courses.data?.items.find((v) => v.id === g.scope_id)?.title;
  return (
    <div className={s.stack} style={{ marginTop: 28 }}>
      <h3>Права доступа</h3>
      <p className={s.muted}>
        Основная роль: {roles[grants.data?.role ?? member.organization_role]}.
        Автор работает с содержанием; проверяющий оценивает работы; руководитель
        видит результаты в своей области.
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
            {roles[g.role]} · {scopeLabel(g) || `${g.scope_type} ${g.scope_id}`}
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
                  "Отозвать это назначение роли? Сеансы участника будут завершены.",
                )
              )
                void action.run(async () => {
                  await api.delete(`/team/members/${member.id}/roles/${g.id}`);
                  await grants.reload();
                }, "Роль отозвана");
            }}
          >
            Отозвать
          </button>
        </div>
      ))}
      {own ? (
        <p className={s.muted}>
          Собственные права изменяет другой администратор или владелец.
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
            }, "Роль назначена");
          }}
        >
          <div className={s.formGrid}>
            <label className={s.field}>
              Роль
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
                    {roles[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              Область
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
                        organization: "Организация",
                        course: "Курс",
                        group: "Группа",
                        department: "Подразделение",
                      }[v]
                    }
                  </option>
                ))}
              </select>
            </label>
            {scope !== "organization" && (
              <label className={s.field}>
                Выберите область
                <select
                  required
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                >
                  <option value="">Выберите…</option>
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
            Назначить роль
          </button>
        </form>
      )}
      <ActionStatus action={action} />
    </div>
  );
}
