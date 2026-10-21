import { useState } from "react";
import { api } from "@/shared/api";
import { ApiError } from "@/shared/errors";
import { useDurableState } from "@/hooks/useDurableState";
import { Shell } from "@/Pages/Workspace/shared";
import { LoadingState, RequestError } from "@/Components/RequestState";
import { useLearningData } from "../Learning/useLearningData";
import {
  type ProgramEnrollment,
  dateLabel,
  stateLabel,
} from "../Learning/types";
import { ActionStatus, TeamTabs, useTeamAction } from "./TeamTools";
import {
  type CatalogueItem,
  type Program,
  type Team,
  type TeamMember,
} from "./types";
import s from "../Learning/learning.module.css";

export default function ProgramsPage() {
  const programs = useLearningData<{ items: Program[] }>("/team/programs");
  const catalogue = useLearningData<{ items: CatalogueItem[] }>(
    "/team/catalogue",
  );
  const team = useLearningData<Team>("/team");
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <Shell
      title="Программы обучения"
      description="Последовательности курсов с фиксированными версиями, сроками и повторными циклами."
    >
      <div className={s.page}>
        <TeamTabs />
        {[programs, catalogue, team].map((r, i) =>
          r.error ? (
            <RequestError
              key={i}
              error={r.error}
              onRetry={() => void r.reload()}
            />
          ) : null,
        )}
        {programs.loading && !programs.data ? (
          <LoadingState>Загружаем программы…</LoadingState>
        ) : (
          programs.data &&
          catalogue.data && (
            <div className={s.layout}>
              <div className={s.stack}>
                <ProgramForm
                  key={selected ?? "new"}
                  program={programs.data.items.find((p) => p.id === selected)}
                  catalogue={catalogue.data.items}
                  reload={programs.reload}
                  select={setSelected}
                />
                {selected && (
                  <Enrollments
                    programId={selected}
                    members={team.data?.members ?? []}
                  />
                )}
              </div>
              <aside className={s.rail}>
                <button className={s.primary} onClick={() => setSelected(null)}>
                  + Новая программа
                </button>
                {programs.data.items.map((p) => (
                  <button
                    className={s.railItem}
                    key={p.id}
                    aria-current={p.id === selected}
                    onClick={() => setSelected(p.id)}
                  >
                    <strong>{p.steps.length}</strong>
                    <span>
                      {p.title}
                      <small>Редакция {p.revision}</small>
                    </span>
                  </button>
                ))}
                {!programs.data.items.length && (
                  <p className={s.muted}>
                    Программы пока не созданы. Добавьте опубликованные курсы в
                    нужном порядке.
                  </p>
                )}
              </aside>
            </div>
          )
        )}
      </div>
    </Shell>
  );
}

function ProgramForm({
  program,
  catalogue,
  reload,
  select,
}: {
  program?: Program;
  catalogue: CatalogueItem[];
  reload: () => Promise<void>;
  select: (id: number | null) => void;
}) {
  const [draft, setDraft, clear] = useDurableState(
    `learning-program:${program?.id ?? "new"}`,
    {
      title: program?.title ?? "",
      description: program?.description ?? "",
      expected_revision: program?.revision ?? 0,
      steps: program?.steps ?? [],
      recurrence_days: program?.recurrence_days
        ? String(program.recurrence_days)
        : "",
      reminder_days: String(program?.reminder_days ?? 3),
    },
  );
  const [add, setAdd] = useState("");
  const action = useTeamAction();
  const conflict = !!program && draft.expected_revision !== program.revision;
  const available = catalogue.filter(
    (c) =>
      !draft.steps.some((s) => s.course_version_id === c.course_version_id),
  );
  const save = async () => {
    const ok = await action.run(async () => {
      const body = {
        ...draft,
        recurrence_days: draft.recurrence_days
          ? Number(draft.recurrence_days)
          : null,
        reminder_days: Number(draft.reminder_days),
      };
      try {
        const result = program
          ? await api.put<Program>(`/team/programs/${program.id}`, body)
          : await api.post<Program>("/team/programs", body);
        clear(draft);
        const clean = { ...draft, expected_revision: result.data.revision };
        setDraft(clean);
        clear(clean);
        await reload();
        select(result.data.id);
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) await reload();
        throw e;
      }
    }, "Программа сохранена. Ранее назначенное обучение сохраняет свою редакцию.");
    return ok;
  };
  return (
    <form
      className={s.card}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h2>{program ? "Редактирование программы" : "Новая программа"}</h2>
      {conflict && (
        <div className={s.conflict}>
          <h3>Программа изменена другим администратором</h3>
          <p>
            На сервере: «{program.title}», редакция {program.revision},{" "}
            {program.steps.length} курсов. Ваши изменения сохранены локально.
          </p>
          <details>
            <summary>Сравнить содержание сервера</summary>
            <pre>{JSON.stringify(program, null, 2)}</pre>
          </details>
          <div className={s.row}>
            <button
              type="button"
              className={s.secondary}
              onClick={() =>
                setDraft({
                  title: program.title,
                  description: program.description,
                  expected_revision: program.revision,
                  steps: program.steps,
                  recurrence_days: program.recurrence_days
                    ? String(program.recurrence_days)
                    : "",
                  reminder_days: String(program.reminder_days),
                })
              }
            >
              Взять серверную редакцию
            </button>
            <button
              type="button"
              className={s.secondary}
              onClick={() =>
                setDraft({ ...draft, expected_revision: program.revision })
              }
            >
              Сохранить мои изменения поверх после сравнения
            </button>
          </div>
        </div>
      )}
      <div className={s.stack}>
        <label className={s.field}>
          Название
          <input
            required
            maxLength={200}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
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
        <h3>Этапы программы</h3>
        <p className={s.muted}>
          Следующий курс открывается после завершения предыдущего. Срок этапа
          считается от даты назначения всей программы.
        </p>
        {draft.steps.map((step, i) => {
          const c = catalogue.find(
            (c) => c.course_version_id === step.course_version_id,
          );
          return (
            <section key={step.course_version_id} className={s.card}>
              <div className={s.spread}>
                <strong>
                  {i + 1}.{" "}
                  {c?.title ?? `Версия курса ${step.course_version_id}`}
                </strong>
                <span className={s.badge}>
                  Редакция {c?.revision ?? "сохранена"}
                </span>
              </div>
              <div className={s.toolbar}>
                <label className={s.field}>
                  Дней на прохождение от назначения
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={step.due_days ?? ""}
                    placeholder="Без срока"
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        steps: draft.steps.map((s, n) =>
                          n === i
                            ? {
                                ...s,
                                due_days: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              }
                            : s,
                        ),
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className={s.secondary}
                  disabled={i === 0}
                  onClick={() => {
                    const steps = [...draft.steps];
                    [steps[i - 1], steps[i]] = [steps[i], steps[i - 1]];
                    setDraft({ ...draft, steps });
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={s.secondary}
                  disabled={i === draft.steps.length - 1}
                  onClick={() => {
                    const steps = [...draft.steps];
                    [steps[i + 1], steps[i]] = [steps[i], steps[i + 1]];
                    setDraft({ ...draft, steps });
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={s.danger}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      steps: draft.steps.filter((_, n) => n !== i),
                    })
                  }
                >
                  Убрать
                </button>
              </div>
            </section>
          );
        })}
        <div className={s.inlineForm}>
          <label className={s.field}>
            Опубликованный курс
            <select value={add} onChange={(e) => setAdd(e.target.value)}>
              <option value="">Выберите курс…</option>
              {available.map((c) => (
                <option key={c.course_version_id} value={c.course_version_id}>
                  {c.title} · редакция {c.revision}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={s.secondary}
            disabled={!add}
            onClick={() => {
              setDraft({
                ...draft,
                steps: [
                  ...draft.steps,
                  { course_version_id: Number(add), due_days: null },
                ],
              });
              setAdd("");
            }}
          >
            Добавить этап
          </button>
        </div>
        {!catalogue.length && (
          <p className={s.notice}>
            Сначала опубликуйте курс в редакторе. Программа использует только
            опубликованные версии.
          </p>
        )}
        <div className={s.formGrid}>
          <label className={s.field}>
            Повторять через дней
            <input
              type="number"
              min={1}
              max={3650}
              value={draft.recurrence_days}
              placeholder="Без повторения"
              onChange={(e) =>
                setDraft({ ...draft, recurrence_days: e.target.value })
              }
            />
          </label>
          <label className={s.field}>
            Показывать в ближайших сроках за дней
            <input
              type="number"
              min={0}
              max={365}
              required
              value={draft.reminder_days}
              onChange={(e) =>
                setDraft({ ...draft, reminder_days: e.target.value })
              }
            />
          </label>
        </div>
        <p className={s.caption}>
          Наступившие повторные циклы доступны в списке назначений ниже. Новый
          цикл создаёт отдельную историю результатов.
        </p>
        <div className={s.row}>
          <button
            className={s.primary}
            disabled={
              action.busy ||
              conflict ||
              !draft.steps.length ||
              !draft.title.trim()
            }
          >
            Сохранить программу
          </button>
          {program && (
            <button
              type="button"
              className={s.danger}
              disabled={action.busy}
              onClick={() => {
                if (
                  confirm(
                    "Архивировать программу? Назначения и результаты останутся доступны, новые циклы создаваться не будут.",
                  )
                )
                  void action.run(async () => {
                    await api.delete(`/team/programs/${program.id}`);
                    await reload();
                    select(null);
                  }, "Программа архивирована");
              }}
            >
              Архивировать
            </button>
          )}
        </div>
        <ActionStatus action={action} />
      </div>
    </form>
  );
}

function Enrollments({
  programId,
  members,
}: {
  programId: number;
  members: TeamMember[];
}) {
  const list = useLearningData<{ items: ProgramEnrollment[] }>(
    `/team/programs/${programId}/enrollments`,
  );
  const [draft, setDraft, clear] = useDurableState(
    `program-enroll:${programId}`,
    { user_ids: [] as number[], cycle_key: "initial" },
  );
  const action = useTeamAction();
  return (
    <section className={s.card}>
      <h2>Участники программы</h2>
      <details>
        <summary>Назначить программу</summary>
        <div className={s.stack}>
          {members
            .filter((m) => m.is_active)
            .map((m) => (
              <label className={s.check} key={m.id}>
                <input
                  type="checkbox"
                  checked={draft.user_ids.includes(m.id)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      user_ids: e.target.checked
                        ? [...draft.user_ids, m.id]
                        : draft.user_ids.filter((id) => id !== m.id),
                    })
                  }
                />
                {m.full_name || m.email}
              </label>
            ))}
          <div className={s.row}>
            <button
              className={s.primary}
              disabled={action.busy || !draft.user_ids.length}
              onClick={() =>
                void action.run(async () => {
                  await api.post(
                    `/team/programs/${programId}/enrollments`,
                    draft,
                  );
                  clear(draft);
                  await list.reload();
                }, "Программа назначена выбранным участникам")
              }
            >
              Назначить
            </button>
            <button
              className={s.secondary}
              disabled={action.busy}
              onClick={() => {
                if (
                  confirm(
                    "Начать отдельный цикл для выбранных участников? Предыдущие назначения сохранятся.",
                  )
                )
                  setDraft({ ...draft, cycle_key: crypto.randomUUID() });
              }}
            >
              Отдельный новый цикл
            </button>
          </div>
          <p className={s.caption}>
            {draft.cycle_key === "initial"
              ? "Первое назначение. Повторное нажатие не создаёт дубль."
              : "Выбран отдельный цикл. Повторная отправка этой формы не создаёт дубль."}
          </p>
        </div>
      </details>
      <ActionStatus action={action} />
      {!!list.error && (
        <RequestError error={list.error} onRetry={() => void list.reload()} />
      )}{" "}
      {list.loading && !list.data && (
        <LoadingState>Загружаем назначения…</LoadingState>
      )}
      {list.data?.items.map((e) => (
        <article className={s.card} key={e.id} style={{ marginTop: 20 }}>
          <div className={s.spread}>
            <strong>
              {members.find((m) => m.id === e.user_id)?.full_name ||
                `Участник ${e.user_id}`}
            </strong>
            <span className={s.badge}>{stateLabel[e.status]}</span>
          </div>
          <p className={s.caption}>
            Редакция программы {e.program_revision} · назначена{" "}
            {dateLabel(e.created_at)}
          </p>
          {e.assignments.map((a, i) => (
            <div className={s.spread} key={a.id}>
              <p>
                {i + 1}. {a.title}
              </p>
              <span>
                {stateLabel[a.status]} · {a.progress_percent}%
              </span>
            </div>
          ))}
          {e.next_cycle_at && (
            <div className={s.spread}>
              <p className={s.caption}>
                Следующий цикл: {dateLabel(e.next_cycle_at)}
              </p>
              <button
                className={s.secondary}
                disabled={
                  action.busy ||
                  new Date(e.next_cycle_at + "Z").getTime() > Date.now()
                }
                onClick={() =>
                  void action.run(async () => {
                    await api.post(
                      `/team/program-enrollments/${e.id}/next-cycle`,
                    );
                    await list.reload();
                  }, "Повторный цикл назначен; предыдущие результаты сохранены")
                }
              >
                Начать повторный цикл
              </button>
            </div>
          )}
        </article>
      ))}
      {list.data && !list.data.items.length && (
        <p className={s.muted}>Программа пока никому не назначена.</p>
      )}
    </section>
  );
}
