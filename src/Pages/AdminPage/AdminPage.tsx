import { useLocale } from "@/i18n/useLocale";
import { useDurableState } from "@/hooks/useDurableState";
import { readDraft, writeDraft, clearDraft } from "@/shared/drafts";
import DraftNotice from "@/Components/DraftNotice";
import StatusPage from "@/Pages/AccessPage/StatusPage";
import { RequestError, LoadingState } from "@/Components/RequestState";
import { useReconnect } from "@/hooks/useReconnect";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { api } from "@/shared/api";
import {
  Shell,
  CopyLink,
  styles as workspaceStyles,
  dateText,
  statuses,
  type Overview,
} from "@/Pages/Workspace/shared";
import adminStyles from "./admin.module.css";
import AdminOverview from "./AdminOverview";
import {
  ArrowUpRight,
  LayoutDashboard,
  Building2,
  Users,
  MailPlus,
  BookOpen,
  Inbox,
  History,
  Settings2,
  RefreshCw,
} from "lucide-react";
const styles = { ...workspaceStyles, ...adminStyles };
const tabIcons = {
  overview: LayoutDashboard,
  organizations: Building2,
  users: Users,
  invitations: MailPlus,
  courses: BookOpen,
  requests: Inbox,
  audit: History,
};
export type Organization = {
  id: number;
  name: string;
  kind: string;
  is_active: boolean;
  seat_limit: number;
  course_limit: number;
  source_limit: number;
  generation_limit: number;
  active_users: number;
  reserved_seats: number;
  courses: number;
};
export type Member = {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
  organization_id: number | null;
  organization_role: string;
  organization_name: string | null;
};
export type Invitation = {
  id: number;
  email: string;
  organization_id: number;
  role: string;
  status: string;
  expires_at: string;
};
type Course = {
  id: number;
  title: string | null;
  owner_id: number | null;
  status: string;
  publication_status: string;
};
type RequestItem = {
  reference: string;
  purpose: string;
  email: string;
  name: string;
  message: string;
  created_at: string;
  status: string;
};
type EventItem = {
  id: number;
  actor_id: number | null;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
};
type OrgForm = {
  id?: number;
  name: string;
  kind: string;
  is_active: boolean;
  seat_limit: number;
  course_limit: number;
  source_limit: number;
  generation_limit: number;
};
type AdminOverview = Overview & {
  users: number;
  organizations: number;
  open_requests: number;
  unassigned_courses: number;
};
const freshOrg = (): OrgForm => ({
  name: "",
  kind: "business",
  is_active: true,
  seat_limit: 10,
  course_limit: 50,
  source_limit: 20,
  generation_limit: 100,
});
const roleLabels: Record<string, string> = {
  owner: "Владелец организации",
  admin: "Администратор",
  author: "Автор",
  reviewer: "Проверяющий",
  manager: "Руководитель",
  member: "Участник",
};
const kinds: Record<string, string> = {
  business: "Компания",
  education: "Образовательная организация",
  government: "Государственный заказчик",
  individual: "Индивидуальный заказчик",
};
const tabs = [
  ["overview", "Обзор"],
  ["organizations", "Заказчики"],
  ["users", "Пользователи"],
  ["invitations", "Приглашения"],
  ["courses", "Курсы"],
  ["requests", "Обращения"],
  ["audit", "Журнал действий"],
];
const eventTitles: Record<string, string> = {
  "organization.created": "Создан заказчик",
  "organization.updated": "Изменены условия заказчика",
  "user.access_changed": "Изменён доступ пользователя",
  "user.recovery_issued": "Выдана ссылка восстановления",
  "invitation.created": "Создано приглашение",
  "invitation.revoked": "Отозвано приглашение",
  "invitation.accepted": "Принято приглашение",
  "course.owner_assigned": "Назначен владелец курса",
  "request.closed": "Обработано обращение",
  "administrator.granted": "Выдан доступ владельца",
};
export default function AdminPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = tabs.some(([k]) => k === params.get("tab"))
    ? params.get("tab")!
    : "overview";
  const [version, setVersion] = useState(0);
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [unassigned, setUnassigned] = useState(false);
  const [requestStatus, setRequestStatus] = useState("open");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [orgSearch, setOrgSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [orgOptions, setOrgOptions] = useState<Organization[]>([]);
  const [userOptions, setUserOptions] = useState<Member[]>([]);
  const [orgForm, setOrgForm] = useDurableState<OrgForm | null>(
    "admin:organization-form",
    null,
  );
  const [userForm, setUserForm] = useDurableState<Member | null>(
    "admin:member-form",
    null,
  );
  const [inviteOrg, setInviteOrg] = useDurableState(
    "admin:invite-organization",
    "",
  );
  const [inviteEmail, setInviteEmail] = useDurableState(
    "admin:invite-email",
    "",
  );
  const [inviteRole, setInviteRole] = useDurableState(
    "admin:invite-role",
    "member",
  );
  const [assign, setAssign] = useDurableState<{
    course: number;
    user: string;
  } | null>("admin:assign-course", null);
  useReconnect(() => setVersion((v) => v + 1));
  useEffect(() => {
    if (!user?.is_admin) return;
    let active = true;
    Promise.all([
      api.get<{ items: Organization[] }>(
        "/admin/organizations?limit=100&q=" + encodeURIComponent(orgSearch),
      ),
      api.get<{ items: Member[] }>(
        "/admin/users?limit=100&q=" + encodeURIComponent(userSearch),
      ),
    ])
      .then(([o, u]) => {
        if (active) {
          setOrgOptions(o.data.items);
          setUserOptions(u.data.items);
        }
      })
      .catch((e) => {
        if (active) setError(e);
      });
    return () => {
      active = false;
    };
  }, [version, user?.is_admin, orgSearch, userSearch]);
  useEffect(() => {
    if (!user?.is_admin) return;
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const suffix = `?limit=50&offset=${offset}&q=${encodeURIComponent(q)}`;
          if (tab === "overview") {
            const r = await api.get<AdminOverview>("/admin/overview");
            if (active) {
              setOverview(r.data);
              setTotal(0);
            }
          }
          if (tab === "organizations") {
            const r = await api.get<{ items: Organization[]; total: number }>(
              "/admin/organizations" + suffix,
            );
            if (active) {
              setOrganizations(r.data.items);
              setTotal(r.data.total);
            }
          }
          if (tab === "users") {
            const r = await api.get<{ items: Member[]; total: number }>(
              "/admin/users" + suffix,
            );
            if (active) {
              setUsers(r.data.items);
              setTotal(r.data.total);
            }
          }
          if (tab === "invitations") {
            const r = await api.get<{ items: Invitation[]; total: number }>(
              "/admin/invitations" + suffix,
            );
            if (active) {
              setInvites(r.data.items);
              setTotal(r.data.total);
            }
          }
          if (tab === "courses") {
            const r = await api.get<{ items: Course[]; total: number }>(
              "/admin/courses" + suffix + `&unassigned=${unassigned}`,
            );
            if (active) {
              setCourses(r.data.items);
              setTotal(r.data.total);
            }
          }
          if (tab === "requests") {
            const r = await api.get<{ items: RequestItem[]; total: number }>(
              "/admin/requests" + suffix + `&status=${requestStatus}`,
            );
            if (active) {
              setRequests(r.data.items);
              setTotal(r.data.total);
            }
          }
          if (tab === "audit") {
            const r = await api.get<{ items: EventItem[]; total: number }>(
              "/admin/audit" + suffix,
            );
            if (active) {
              setEvents(r.data.items);
              setTotal(r.data.total);
            }
          }
          if (active) setError(null);
        } catch (e) {
          if (active) setError(e);
        } finally {
          if (active) setLoading(false);
        }
      })();
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [tab, version, q, offset, unassigned, requestStatus, user?.is_admin]);
  async function perform(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await action();
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  function switchTab(next: string) {
    setParams({ tab: next });
    setQ("");
    setOffset(0);
    setLink("");
    setMessage("");
    setOrgSearch("");
    setUserSearch("");
  }
  function openOrgForm(next: OrgForm) {
    if (orgForm)
      writeDraft(
        `admin:org:${orgForm.id ?? "new"}`,
        orgForm,
        undefined,
        user?.id ?? null,
      );
    setOrgForm(
      readDraft<OrgForm>(`admin:org:${next.id ?? "new"}`, user?.id ?? null)
        ?.value ?? next,
    );
  }
  function openUserForm(next: Member) {
    if (userForm)
      writeDraft(
        `admin:user:${userForm.id}`,
        userForm,
        undefined,
        user?.id ?? null,
      );
    setUserForm(
      readDraft<Member>(`admin:user:${next.id}`, user?.id ?? null)?.value ??
        next,
    );
  }
  function saveOrg(e: FormEvent) {
    e.preventDefault();
    if (!orgForm) return;
    void perform(async () => {
      const { id, ...body } = orgForm;
      if (id) await api.put(`/admin/organizations/${id}`, body);
      else await api.post("/admin/organizations", body);
      clearDraft(`admin:org:${orgForm.id ?? "new"}`, orgForm, user?.id ?? null);
      setMessage(
        id
          ? t("Условия заказчика сохранены.")
          : t("Заказчик создан. Теперь можно пригласить его администратора."),
      );
      setOrgForm(null);
    });
  }
  function saveUser(e: FormEvent) {
    e.preventDefault();
    if (!userForm) return;
    void perform(async () => {
      await api.put(`/admin/users/${userForm.id}`, {
        is_active: userForm.is_active,
        organization_id: userForm.organization_id,
        organization_role: userForm.organization_role,
      });
      clearDraft(`admin:user:${userForm.id}`, userForm, user?.id ?? null);
      setMessage(
        t("Доступ сохранён. Предыдущие сеансы пользователя завершены."),
      );
      setUserForm(null);
    });
  }
  function createInvite(e: FormEvent) {
    e.preventDefault();
    void perform(async () => {
      const r = await api.post<{ url: string; mail_status: string }>(
        "/admin/invitations",
        {
          email: inviteEmail,
          organization_id: Number(inviteOrg),
          role: inviteRole,
          locale,
        },
      );
      setLink(r.data.url);
      setLinkTitle(t("Приглашение готово · действует 7 дней"));
      setInviteEmail("");
      setMessage(
        r.data.mail_status === "queued"
          ? t("Ссылка создана, письмо поставлено в очередь доставки.")
          : t(
              "Ссылка создана. Почта пока не настроена: передайте ссылку адресату лично.",
            ),
      );
    });
  }
  if (!user?.is_admin)
    return (
      <StatusPage
        code="403"
        title={t("Доступ заблокирован")}
        description={t(
          "У вашего аккаунта нет прав на управление платформой. Перейдите в рабочее пространство или обратитесь к администратору организации.",
        )}
      />
    );
  return (
    <Shell
      title={t("Управление Лерниумом")}
      description={t(
        "Заказчики, доступ, ограничения и обращения в одном месте.",
      )}
      action={
        <button
          className={styles.secondary}
          onClick={() => setVersion((v) => v + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          {t("Обновить данные")}
        </button>
      }
    >
      <fieldset disabled={busy} className={styles.layout}>
        <aside className={styles.navigation}>
          <div className={styles.navigationTitle}>
            {t("Управление платформой")}
          </div>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label={t("Разделы админки")}
            onKeyDown={(event) => {
              const keys = [
                "ArrowDown",
                "ArrowRight",
                "ArrowUp",
                "ArrowLeft",
                "Home",
                "End",
              ];
              if (!keys.includes(event.key)) return;
              event.preventDefault();
              const index = tabs.findIndex(([key]) => key === tab);
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : (index +
                        (["ArrowDown", "ArrowRight"].includes(event.key)
                          ? 1
                          : -1) +
                        tabs.length) %
                      tabs.length;
              switchTab(tabs[next][0]);
              const controls = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
              controls[next]?.focus();
            }}
          >
            {tabs.map(([key, label]) => {
              const Icon = tabIcons[key as keyof typeof tabIcons];
              return (
                <button
                  key={key}
                  id={`admin-tab-${key}`}
                  role="tab"
                  aria-selected={tab === key}
                  aria-controls="admin-content"
                  tabIndex={tab === key ? 0 : -1}
                  onClick={() => switchTab(key)}
                >
                  <Icon size={18} aria-hidden="true" />
                  {t(label)}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <Link className={styles.operationsLink} to="/admin/operations">
            <Settings2 size={18} aria-hidden="true" />
            {t("Состояние установки и доставки")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </aside>
        <div
          id="admin-content"
          role="tabpanel"
          aria-labelledby={`admin-tab-${tab}`}
          className={styles.content}
        >
          <DraftNotice />
          {!!error && (
            <RequestError
              error={error}
              onRetry={() => setVersion((v) => v + 1)}
            />
          )}
          {message && (
            <p className={styles.success} role="status">
              {message}
            </p>
          )}
          {link && <CopyLink key={link} url={link} title={linkTitle} />}
          {tab === "overview" && overview && (
            <AdminOverview
              data={overview}
              onNavigate={(next, onlyUnassigned) => {
                switchTab(next);
                if (onlyUnassigned) setUnassigned(true);
              }}
            />
          )}
          {(tab === "organizations" || tab === "users") && (
            <div className={styles.between}>
              <label className={styles.search}>
                {t("Поиск")}
                <input
                  type="search"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setOffset(0);
                  }}
                  placeholder={
                    tab === "users"
                      ? t("Имя или email")
                      : t("Название заказчика")
                  }
                />
              </label>
              {tab === "organizations" && (
                <button
                  className={styles.primary}
                  onClick={() => openOrgForm(freshOrg())}
                >
                  {t("Добавить заказчика +")}
                </button>
              )}
            </div>
          )}
          {tab === "organizations" && orgForm && (
            <section className={styles.panel}>
              <h2>
                {orgForm.id ? t("Условия заказчика") : t("Новый заказчик")}
              </h2>
              <form className={styles.form} onSubmit={saveOrg}>
                <label>
                  {t("Название")}
                  <input
                    required
                    minLength={2}
                    maxLength={200}
                    value={orgForm.name}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  {t("Тип")}
                  <select
                    value={orgForm.kind}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, kind: e.target.value })
                    }
                  >
                    {Object.entries(kinds).map(([k, v]) => (
                      <option key={k} value={k}>
                        {t(v)}
                      </option>
                    ))}
                  </select>
                </label>
                {(
                  [
                    ["seat_limit", t("Участников, включая приглашения")],
                    ["course_limit", t("Курсов в организации")],
                    ["source_limit", t("Источников на один курс")],
                    ["generation_limit", t("Запусков генерации в месяц")],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      required
                      min={key === "generation_limit" ? 0 : 1}
                      max={key === "source_limit" ? 1000 : 100000}
                      value={orgForm[key]}
                      onChange={(e) =>
                        setOrgForm({
                          ...orgForm,
                          [key]: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ))}
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={orgForm.is_active}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, is_active: e.target.checked })
                    }
                  />
                  {t("Доступ организации включён")}
                </label>
                <p className={styles.span}>
                  {t(
                    "При снижении лимита существующие данные сохраняются, новые операции сверх лимита блокируются. Приостановка доступа запрещает вход участникам. Месячный лимит учитывает новые запуски, включая неудачные; продолжение приостановленного запуска не расходует новое место.",
                  )}
                </p>
                <div className={styles.row}>
                  <button className={styles.primary} disabled={busy}>
                    {t("Сохранить заказчика")}
                  </button>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => setOrgForm(null)}
                  >
                    {t("Отмена")}
                  </button>
                </div>
              </form>
            </section>
          )}
          {tab === "organizations" && !loading && (
            <div className={styles.grid}>
              {organizations.map((o) => (
                <article className={styles.card} key={o.id}>
                  <Link
                    className={styles.cardAction}
                    to={`/admin/organizations/${o.id}/delivery`}
                    aria-label={`${o.name} · ${t("Функции и профиль")}`}
                  >
                    <ArrowUpRight size={24} aria-hidden="true" />
                  </Link>
                  <span className={styles.badge}>
                    {o.is_active ? t("Доступ включён") : t("Приостановлен")}
                  </span>
                  <h2>{o.name}</h2>
                  <p>
                    {t(kinds[o.kind] ?? o.kind)} · №{o.id}
                  </p>
                  <dl className={styles.quotaList}>
                    <div>
                      <dt>{t("Участники и приглашения:")}</dt>
                      <dd>
                        {o.reserved_seats} <span>/ {o.seat_limit}</span>
                      </dd>
                      <progress
                        value={Math.min(o.reserved_seats, o.seat_limit)}
                        max={o.seat_limit}
                        aria-label={t("Участники и приглашения:")}
                      />
                    </div>
                    <div>
                      <dt>{t("Курсы:")}</dt>
                      <dd>
                        {o.courses} <span>/ {o.course_limit}</span>
                      </dd>
                      <progress
                        value={Math.min(o.courses, o.course_limit)}
                        max={o.course_limit}
                        aria-label={t("Курсы:")}
                      />
                    </div>
                    <div>
                      <dt>{t("Источников на курс:")}</dt>
                      <dd>{o.source_limit}</dd>
                    </div>
                    <div>
                      <dt>{t("Генераций в месяц:")}</dt>
                      <dd>{o.generation_limit}</dd>
                    </div>
                  </dl>
                  <div className={styles.row}>
                    <button
                      className={styles.secondary}
                      onClick={() =>
                        openOrgForm({
                          id: o.id,
                          name: o.name,
                          kind: o.kind,
                          is_active: o.is_active,
                          seat_limit: o.seat_limit,
                          course_limit: o.course_limit,
                          source_limit: o.source_limit,
                          generation_limit: o.generation_limit,
                        })
                      }
                    >
                      {t("Настроить лимиты")}
                    </button>
                    <Link
                      className={styles.secondary}
                      to={`/admin/organizations/${o.id}/delivery`}
                    >
                      {t("Функции и профиль")}
                    </Link>
                    <Link
                      className={styles.secondary}
                      to={`/admin/organizations/${o.id}/billing`}
                    >
                      {t("Договор и счета")}
                    </Link>
                    <button
                      className={styles.primary}
                      disabled={!o.is_active}
                      onClick={() => {
                        switchTab("invitations");
                        setInviteOrg(String(o.id));
                        setInviteRole("owner");
                      }}
                    >
                      {t("Пригласить владельца")}
                    </button>
                  </div>
                </article>
              ))}
              {!organizations.length && (
                <div className={styles.empty}>
                  {t(
                    "Заказчики не найдены. Добавьте первого или измените поиск.",
                  )}
                </div>
              )}
            </div>
          )}
          {tab === "users" && userForm && (
            <section className={styles.panel}>
              <h2>
                {t("Доступ:")} {userForm.email}
              </h2>
              <form className={styles.form} onSubmit={saveUser}>
                <label>
                  {t("Поиск организации")}
                  <input
                    type="search"
                    value={orgSearch}
                    onChange={(e) => setOrgSearch(e.target.value)}
                    placeholder={t("Найти по названию")}
                  />
                </label>
                <label>
                  {t("Организация")}
                  <select
                    value={userForm.organization_id ?? ""}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        organization_id: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  >
                    <option value="">{t("Личный аккаунт")}</option>
                    {orgOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("Роль в организации")}
                  <select
                    value={userForm.organization_role}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        organization_role: e.target.value,
                      })
                    }
                  >
                    <option value="member">{t("Участник")}</option>
                    <option value="admin">{t("Администратор")}</option>
                    <option value="author">{t("Автор")}</option>
                    <option value="reviewer">{t("Проверяющий")}</option>
                    <option value="manager">{t("Руководитель")}</option>
                    <option
                      value="owner"
                      disabled={
                        users.find((item) => item.id === userForm.id)
                          ?.organization_role !== "owner"
                      }
                    >
                      {t("Владелец организации")}
                    </option>
                  </select>
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={userForm.is_active}
                    onChange={(e) =>
                      setUserForm({ ...userForm, is_active: e.target.checked })
                    }
                  />
                  {t("Аккаунт активен")}
                </label>
                <p className={styles.span}>
                  {t(
                    "Изменение доступа завершит предыдущие сеансы. Курсы остаются в исходном пространстве. Перевод человека не переносит материалы другой организации.",
                  )}
                </p>
                <div className={styles.row}>
                  <button className={styles.primary} disabled={busy}>
                    {t("Сохранить доступ")}
                  </button>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => setUserForm(null)}
                  >
                    {t("Отмена")}
                  </button>
                </div>
              </form>
            </section>
          )}
          {tab === "users" && !loading && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("Пользователь")}</th>
                    <th>{t("Организация")}</th>
                    <th>{t("Роль и доступ")}</th>
                    <th>{t("Действия")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        {u.full_name || t("Без имени")}
                        <small>
                          {u.email} · №{u.id}
                        </small>
                      </td>
                      <td>{u.organization_name || t("Личный аккаунт")}</td>
                      <td>
                        {u.is_admin
                          ? t("Администратор Лерниума")
                          : t(
                              roleLabels[u.organization_role] ??
                                u.organization_role,
                            )}
                        <small>
                          {u.is_active ? t("Активен") : t("Отключён")}
                        </small>
                      </td>
                      <td>
                        {u.is_admin ? (
                          <span className={styles.muted}>
                            {t("Защищённый аккаунт")}
                          </span>
                        ) : (
                          <div className={styles.row}>
                            <button
                              className={styles.secondary}
                              onClick={() => openUserForm(u)}
                            >
                              {t("Изменить доступ")}
                            </button>
                            <button
                              className={styles.secondary}
                              disabled={busy || !u.is_active}
                              onClick={() =>
                                void perform(async () => {
                                  const r = await api.post<{ url: string }>(
                                    `/admin/users/${u.id}/recovery-link`,
                                  );
                                  setLink(r.data.url);
                                  setLinkTitle(
                                    t("Восстановление для {v0} · 30 минут", {
                                      v0: u.email,
                                    }),
                                  );
                                })
                              }
                            >
                              {t("Восстановить доступ")}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!users.length && (
                <p style={{ padding: 20 }}>{t("Пользователи не найдены.")}</p>
              )}
            </div>
          )}
          {tab === "invitations" && (
            <>
              <section className={styles.panel}>
                <h2>{t("Пригласить нового пользователя")}</h2>
                <form className={styles.form} onSubmit={createInvite}>
                  <label>
                    {t("Поиск организации")}
                    <input
                      type="search"
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      placeholder={t("Найти по названию")}
                    />
                  </label>
                  <label>
                    {t("Организация")}
                    <select
                      required
                      value={inviteOrg}
                      onChange={(e) => setInviteOrg(e.target.value)}
                    >
                      <option value="">{t("Выберите заказчика")}</option>
                      {orgOptions
                        .filter((o) => o.is_active)
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Email
                    <input
                      required
                      type="email"
                      maxLength={255}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </label>
                  <label>
                    {t("Роль")}
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                    >
                      <option value="member">{t("Участник")}</option>
                      <option value="admin">{t("Администратор")}</option>
                      <option value="author">{t("Автор")}</option>
                      <option value="reviewer">{t("Проверяющий")}</option>
                      <option value="manager">{t("Руководитель")}</option>
                      <option value="owner">{t("Владелец организации")}</option>
                    </select>
                  </label>
                  <button className={styles.primary} disabled={busy}>
                    {t("Создать приглашение")}
                  </button>
                </form>
                <p>
                  {t(
                    "Приглашения резервируют места. Пользователь личного аккаунта может принять приглашение после входа. Аккаунт другой организации сначала завершает прежнее членство.",
                  )}
                </p>
              </section>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>{t("Организация")}</th>
                      <th>{t("Роль")}</th>
                      <th>{t("Состояние")}</th>
                      <th>{t("Действие")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((i) => (
                      <tr key={i.id}>
                        <td>{i.email}</td>
                        <td>
                          {orgOptions.find((o) => o.id === i.organization_id)
                            ?.name || `№${i.organization_id}`}
                        </td>
                        <td>{t(roleLabels[i.role] ?? i.role)}</td>
                        <td>
                          {t(statuses[i.status] ?? i.status)}
                          <small>
                            {t("До")} {dateText(i.expires_at)}
                          </small>
                        </td>
                        <td>
                          {i.status === "pending" && (
                            <button
                              className={styles.danger}
                              disabled={busy}
                              onClick={() =>
                                void perform(async () => {
                                  await api.delete(
                                    `/admin/invitations/${i.id}`,
                                  );
                                  setMessage(t("Приглашение отозвано."));
                                })
                              }
                            >
                              {t("Отозвать")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!invites.length && !loading && (
                  <p style={{ padding: 20 }}>{t("Приглашений пока нет.")}</p>
                )}
              </div>
            </>
          )}
          {tab === "courses" && (
            <>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={unassigned}
                  onChange={(e) => {
                    setUnassigned(e.target.checked);
                    setOffset(0);
                  }}
                />
                {t("Только без владельца")}
              </label>
              {assign && (
                <section className={styles.panel}>
                  <h2>
                    {t("Назначить владельца курса №")}
                    {assign.course}
                  </h2>
                  <p>
                    {t(
                      "Убедитесь, что материалы принадлежат выбранному пользователю. Курс появится только в его аккаунте.",
                    )}
                  </p>
                  <form
                    className={styles.form}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void perform(async () => {
                        await api.post(
                          `/admin/courses/${assign.course}/assign-owner`,
                          { user_id: Number(assign.user) },
                        );
                        setAssign(null);
                        setMessage(t("Владелец курса назначен."));
                      });
                    }}
                  >
                    <label>
                      {t("Поиск владельца")}
                      <input
                        type="search"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder={t("Имя или email")}
                      />
                    </label>
                    <label>
                      {t("Пользователь")}
                      <select
                        required
                        value={assign.user}
                        onChange={(e) =>
                          setAssign({ ...assign, user: e.target.value })
                        }
                      >
                        <option value="">{t("Выберите владельца")}</option>
                        {userOptions
                          .filter((u) => u.is_active)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.email}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button className={styles.primary} disabled={busy}>
                      {t("Назначить владельца")}
                    </button>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => setAssign(null)}
                    >
                      {t("Отмена")}
                    </button>
                  </form>
                </section>
              )}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t("Курс")}</th>
                      <th>{t("Владелец")}</th>
                      <th>{t("Состояние")}</th>
                      <th>{t("Действие")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((c) => (
                      <tr key={c.id}>
                        <td>
                          {c.title || t("Без названия")}
                          <small>№{c.id}</small>
                        </td>
                        <td>
                          {c.owner_id === null
                            ? t("Не назначен")
                            : userOptions.find((u) => u.id === c.owner_id)
                                ?.email ||
                              t("Пользователь №{v0}", { v0: c.owner_id })}
                        </td>
                        <td>
                          {t(statuses[c.status] ?? c.status)}
                          <small>
                            {t(
                              statuses[c.publication_status] ??
                                c.publication_status,
                            )}
                          </small>
                        </td>
                        <td>
                          {c.owner_id === null && (
                            <button
                              className={styles.secondary}
                              onClick={() =>
                                setAssign({ course: c.id, user: "" })
                              }
                            >
                              {t("Назначить владельца")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {tab === "requests" && (
            <>
              <label className={styles.search}>
                {t("Показывать")}
                <select
                  value={requestStatus}
                  onChange={(e) => {
                    setRequestStatus(e.target.value);
                    setOffset(0);
                  }}
                >
                  <option value="open">{t("Открытые обращения")}</option>
                  <option value="closed">{t("Обработанные")}</option>
                </select>
              </label>
              {requests.map((r) => (
                <section className={styles.panel} key={r.reference}>
                  <h2>{r.name || r.email}</h2>
                  <p>
                    {r.email} · {dateText(r.created_at)}
                  </p>
                  <p style={{ whiteSpace: "pre-wrap" }}>{r.message}</p>
                  <p>
                    {t("Номер:")} {r.reference}
                  </p>
                  {r.status === "open" && (
                    <button
                      className={styles.secondary}
                      disabled={busy}
                      onClick={() =>
                        void perform(async () => {
                          await api.post(
                            `/admin/requests/${r.reference}/close`,
                          );
                          setMessage(t("Обращение отмечено как обработанное."));
                        })
                      }
                    >
                      {t("Отметить обработанным")}
                    </button>
                  )}
                </section>
              ))}
              {!requests.length && !loading && (
                <div className={styles.empty}>
                  {t("Обращений в этом списке нет.")}
                </div>
              )}
            </>
          )}
          {tab === "audit" && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("Когда")}</th>
                    <th>{t("Кто")}</th>
                    <th>{t("Действие")}</th>
                    <th>{t("Объект")}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td>{dateText(e.created_at)}</td>
                      <td>
                        {e.actor_id
                          ? userOptions.find((u) => u.id === e.actor_id)
                              ?.email ||
                            t("Пользователь №{v0}", { v0: e.actor_id })
                          : t("Система")}
                      </td>
                      <td>{t(eventTitles[e.action] || e.action)}</td>
                      <td>
                        {e.target_type} №{e.target_id}
                        <details>
                          <summary>{t("Подробности")}</summary>
                          <pre>{JSON.stringify(e.details, null, 2)}</pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!events.length && !loading && (
                <p style={{ padding: 20 }}>{t("Действий пока нет.")}</p>
              )}
            </div>
          )}
          {loading && <LoadingState>{t("Загружаем данные…")}</LoadingState>}
          {total > 0 && (
            <div className={styles.between}>
              <span className={styles.muted}>
                {t("Всего:")} {total} {t("· показаны")} {offset + 1}–
                {Math.min(offset + 50, total)}
              </span>
              <div className={styles.row}>
                <button
                  className={styles.secondary}
                  disabled={offset === 0 || loading}
                  onClick={() => setOffset((v) => Math.max(0, v - 50))}
                >
                  {t("Назад")}
                </button>
                <button
                  className={styles.secondary}
                  disabled={offset + 50 >= total || loading}
                  onClick={() => setOffset((v) => v + 50)}
                >
                  {t("Далее")}
                </button>
              </div>
            </div>
          )}
        </div>
      </fieldset>
    </Shell>
  );
}
