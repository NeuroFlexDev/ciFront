import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/shared/api";
import { useDurableState } from "@/hooks/useDurableState";
import { Shell } from "@/Pages/Workspace/shared";
import { LoadingState, RequestError } from "@/Components/RequestState";
import DraftNotice from "@/Components/DraftNotice";
import { useLearningData } from "../Learning/useLearningData";
import { type Assignment, dateLabel, stateLabel } from "../Learning/types";
import type { CatalogueItem, Group, Person, Team } from "./types";
import { initials, roles } from "./types";
import { ActionStatus, TeamTabs, useTeamAction } from "./TeamTools";
import s from "../Learning/learning.module.css";

export default function AssignmentsPage() {
  const [params] = useSearchParams();
  const preferredCourse = Number(params.get("course") || 0),
    preferredUser = Number(params.get("user") || 0);
  const catalogue = useLearningData<{ items: CatalogueItem[] }>(
    "/team/catalogue",
  );
  const team = useLearningData<Team>("/team");
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
    if (!selected) return;
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
        },
      );
      await assignments.reload();
      return response.data;
    }, "Назначение подтверждено. Участники увидят курс в «Моём обучении». Повторный запрос не создаёт дубль.");
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
      title="Назначить обучение"
      description="Выберите опубликованную версию курса, участников и срок. Старые результаты сохраняются."
    >
      <div className={s.page}>
        <TeamTabs />
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
            <h2>Выбранная версия курса недоступна</h2>
            <p>
              Черновик назначения сохранён. Выберите доступную опубликованную
              версию перед отправкой.
            </p>
            <label className={s.field}>
              Доступные версии
              <select
                value=""
                onChange={(e) =>
                  setDraft({ ...draft, versionId: Number(e.target.value) })
                }
              >
                <option value="">Выберите версию…</option>
                {catalogue.data.items.map((v) => (
                  <option key={v.course_version_id} value={v.course_version_id}>
                    {v.title} · версия {v.revision}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}
        {!catalogue.data && catalogue.loading && (
          <LoadingState>Загружаем каталог опубликованных курсов…</LoadingState>
        )}
        {catalogue.data && !catalogue.data.items.length ? (
          <section className={s.empty}>
            <h2>Нет доступных опубликованных курсов</h2>
            <p>
              Автор должен опубликовать полную версию курса. Руководителю также
              нужно разрешение на этот курс.
            </p>
            <Link className={s.primary} to="/courses">
              Открыть курсы
            </Link>
          </section>
        ) : (
          selected && (
            <>
              <section className={s.card}>
                <div className={s.formGrid}>
                  <label className={s.field}>
                    Курс и зафиксированная версия
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
                          {v.title} · версия {v.revision}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={s.field}>
                    Срок прохождения
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
                  Опубликовано: {dateLabel(selected.published_at)}. Назначенный
                  снимок не изменится после редактирования курса.
                </p>
                <details>
                  <summary>Повторное назначение</summary>
                  <p className={s.muted}>
                    Обычное назначение не дублируется. Для отдельного нового
                    цикла создайте идентификатор; прежние результаты останутся в
                    истории.
                  </p>
                  <div className={s.row}>
                    <code>
                      {draft.cycleKey === "initial"
                        ? "Первичное обучение"
                        : draft.cycleKey}
                    </code>
                    <button
                      className={s.secondary}
                      onClick={() =>
                        setDraft({ ...draft, cycleKey: crypto.randomUUID() })
                      }
                    >
                      Начать новый цикл назначения
                    </button>
                    {draft.cycleKey !== "initial" && (
                      <button
                        className={s.secondary}
                        onClick={() =>
                          setDraft({ ...draft, cycleKey: "initial" })
                        }
                      >
                        Вернуть первичное назначение
                      </button>
                    )}
                  </div>
                </details>
              </section>
              <section className={s.card} style={{ marginTop: 24 }}>
                <label className={s.field}>
                  Поиск сотрудника или должности
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Имя, email или должность…"
                  />
                </label>
                <div className={s.tablist} style={{ marginTop: 20 }}>
                  <button
                    aria-selected={tab === "people"}
                    onClick={() => setTab("people")}
                  >
                    Участники · {draft.users.length} выбрано
                  </button>
                  <button
                    aria-selected={tab === "groups"}
                    onClick={() => setTab("groups")}
                  >
                    Группы · {draft.groups.length} выбрано
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
                              roles[m.organization_role] ||
                              "Участник"}
                          </p>
                          <span className={s.muted}>{m.email}</span>
                        </label>
                      );
                    })}
                    {!members.length && (
                      <p className={s.empty}>
                        Участники по этому запросу не найдены.
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
                      Назначать эту же версию новым участникам выбранных групп.
                      Срок остаётся общим для группы.
                    </label>
                  </>
                )}
                {(draft.users.length > 0 || draft.groups.length > 0) && (
                  <DraftNotice />
                )}
                <ActionStatus action={action} />
                <div className={s.stickyActions}>
                  <button
                    className={s.primary}
                    disabled={
                      action.busy ||
                      (!draft.users.length && !draft.groups.length)
                    }
                    onClick={() => void submit()}
                  >
                    {action.busy ? "Назначаем…" : "Подтвердить назначение →"}
                  </button>
                </div>
              </section>
              <section className={s.card} style={{ marginTop: 24 }}>
                <h2>Назначения этого курса</h2>
                {!!assignments.error && (
                  <RequestError
                    error={assignments.error}
                    onRetry={() => void assignments.reload()}
                  />
                )}{" "}
                {assignments.loading && !assignments.data && <LoadingState />}
                {assignments.data && !assignments.data.items.length && (
                  <p className={s.muted}>
                    Пока никому не назначен в вашей области доступа.
                  </p>
                )}
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>Участник</th>
                        <th>Версия</th>
                        <th>Статус</th>
                        <th>Срок</th>
                        <th>Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.data?.items.map((a) => (
                        <tr key={a.id}>
                          <td>
                            {team.data?.members.find((m) => m.id === a.user_id)
                              ?.full_name || `Участник ${a.user_id}`}
                          </td>
                          <td>{a.revision}</td>
                          <td>{stateLabel[a.status] ?? a.status}</td>
                          <td>{dateLabel(a.due_at)}</td>
                          <td>
                            {a.state === "active" && (
                              <button
                                className={s.secondary}
                                onClick={() => setConfirmRevoke(a.id)}
                              >
                                Отозвать доступ
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
                      Отозвать доступ к этому назначению? Ответы, оценки и
                      история останутся.
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
                          }, "Доступ к назначению отозван; результаты сохранены.")
                        }
                      >
                        Отозвать назначение
                      </button>
                      <button
                        className={s.secondary}
                        onClick={() => setConfirmRevoke(null)}
                      >
                        Оставить
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
