import {adminAppUrl} from '@/shared/surface';
import { useRoleNames } from "@/Pages/TeamLearning/useRoleNames";
import { useLocale } from "@/i18n/useLocale";
import { RequestError, LoadingState } from "@/Components/RequestState";
import { useDurableState } from "@/hooks/useDurableState";
import DraftNotice from "@/Components/DraftNotice";
import { useReconnect } from "@/hooks/useReconnect";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowUpRight, ChevronDown, Plus, Search } from "lucide-react";
import { api } from "@/shared/api";
import { useAuth } from "@/auth/useAuth";
import { Shell, CopyLink, styles, statuses, dateText } from "./shared";
import { initials } from "@/Pages/TeamLearning/types";
import teamStyles from "./team.module.css";
import type {
  Organization,
  Member,
  Invitation,
} from "@/Pages/AdminPage/AdminPage";
type Team = {
  organization: Organization | null;
  members: Member[];
  invitations: Invitation[];
  can_manage: boolean;
};
export default function TeamPage() {
  const {user} = useAuth();
  if (user?.organization_kind === 'business' && ['owner','admin','manager'].includes(user.organization_role ?? '')) return <Navigate to='/company' replace />;
  return <OrganizationTeamPage />;
}
function OrganizationTeamPage() {
  const { t } = useLocale();
  const roleName = useRoleNames();

  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [inviteForm, setInviteForm] = useDurableState("team-invitation", {
    email: "",
    role: "member",
  });
  const { email, role } = inviteForm;
  const setEmail = (email: string) =>
    setInviteForm((previous) => ({ ...previous, email }));
  const setRole = (role: string) =>
    setInviteForm((previous) => ({ ...previous, role }));
  const [url, setUrl] = useState("");
  const [mailStatus, setMailStatus] = useState("");
  const [query, setQuery] = useState("");
  useReconnect(() => setVersion((v) => v + 1));
  useEffect(() => {
    let active = true;
    api
      .get<Team>("/team")
      .then((r) => {
        if (active) {
          setTeam(r.data);
          setError(null);
        }
      })
      .catch((e) => {
        if (active) setError(e);
      });
    return () => {
      active = false;
    };
  }, [version]);
  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  function invite(e: FormEvent) {
    e.preventDefault();
    void perform(async () => {
      const r = await api.post<{ url: string; mail_status: string }>(
        "/team/invitations",
        { email, role, organization_id: team?.organization?.id },
      );
      setUrl(r.data.url);
      setMailStatus(r.data.mail_status);
      setEmail("");
    });
  }
  return (
    <Shell
      title={t("Команда")}
      description={team?.organization?.name || t("Участники вашей организации")}
    >
      {!!error && (
        <RequestError error={error} onRetry={() => setVersion((v) => v + 1)} />
      )}
      {!team && !error && (
        <LoadingState>{t("Загружаем команду…")}</LoadingState>
      )}
      {team && !team.organization && (
        <section className={styles.empty}>
          <h2>{t("У вас личный аккаунт")}</h2>
          <p>
            {t(
              "Команда появится после подключения к организации. Вы уже можете создавать собственные курсы.",
            )}
          </p>
          <Link
            className={styles.primary}
            to={user?.is_admin ? `${adminAppUrl}/admin?tab=organizations` : "/courses"}
          >
            {user?.is_admin ? t("Создать организацию") : t("Мои курсы")}
          </Link>
        </section>
      )}
      {team?.organization && (
        <div className={teamStyles.team}>
          <p className={teamStyles.capacity}>
            {t("Занято мест с приглашениями:") + " "}
            {team.organization.reserved_seats}
            {" " + t("из") + " "}
            {team.organization.seat_limit}
            {t(". Курсов организации:") + " "}
            {team.organization.courses}
            {" " + t("из") + " "}
            {team.organization.course_limit}.
          </p>
          {url && (
            <>
              <CopyLink url={url} key={url} />
              <p role="status">
                {mailStatus === "queued"
                  ? t(
                      "Приглашение поставлено в очередь доставки. Ссылку также можно передать лично.",
                    )
                  : t(
                      "Почтовая доставка пока не настроена. Передайте ссылку адресату лично.",
                    )}
              </p>
            </>
          )}
          {team.can_manage && (
            <details className={teamStyles.invite}>
              <summary>
                <span className={teamStyles.inviteLabel}>
                  <Plus size={20} aria-hidden="true" />
                  {t("Пригласить участника")}
                </span>
                <ChevronDown
                  size={20}
                  className={teamStyles.chevron}
                  aria-hidden="true"
                />
              </summary>
              <div className={teamStyles.inviteBody}>
                <DraftNotice />
                <form className={styles.form} onSubmit={invite}>
                  <label>
                    Email
                    <input
                      required
                      type="email"
                      disabled={busy}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label>
                    {t("Роль")}
                    <select
                      value={role}
                      disabled={busy}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="member">{roleName("member")}</option>
                      <option value="author">{roleName("author")}</option>
                      <option value="reviewer">{roleName("reviewer")}</option>
                      <option value="manager">{roleName("manager")}</option>
                      {user?.organization_role === "owner" && (
                        <option value="admin">{roleName("admin")}</option>
                      )}
                    </select>
                  </label>
                  <button className={styles.primary} disabled={busy}>
                    {t("Создать приглашение")}
                  </button>
                </form>
                <p>
                  {t(
                    "Передайте полученную ссылку сотруднику лично. Он задаст пароль и примет условия при первом входе.",
                  )}
                </p>
              </div>
            </details>
          )}
          <div className={teamStyles.toolbar}>
            <label className={teamStyles.search}>
              <span className={teamStyles.searchLabel}>
                {t("Найти участника")}
              </span>
              <Search size={21} aria-hidden="true" />
              <input
                type="search"
                placeholder={t("Имя или почта")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            {team.can_manage && (
              <div className={teamStyles.tools}>
                <Link className={styles.secondary} to="/groups">
                  {t("Группы и подразделения")}
                </Link>
                <Link className={styles.secondary} to="/team-settings">
                  {t("Роли и настройки")}
                </Link>
                <Link className={styles.secondary} to="/assignments">
                  {t("Назначить курс")}
                </Link>
              </div>
            )}
          </div>
          {!team.members.some((m) =>
            (m.full_name + " " + m.email)
              .toLowerCase()
              .includes(query.toLowerCase()),
          ) && <p>{t("Участники не найдены. Измените поисковый запрос.")}</p>}
          <div className={teamStyles.people}>
            {team.members
              .filter((m) =>
                (m.full_name + " " + m.email)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((m) => (
                <article key={m.id} className={teamStyles.person}>
                  {(team.can_manage || m.id === user?.id) && (
                    <Link
                      className={teamStyles.cornerAction}
                      to={
                        m.id === user?.id
                          ? "/account"
                          : `/team-settings?user=${m.id}`
                      }
                      aria-label={`${m.full_name || m.email} · ${m.id === user?.id ? t("Личный профиль") : t("Роли и области доступа")}`}
                    >
                      <ArrowUpRight
                        size={26}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </Link>
                  )}
                  <div className={teamStyles.avatar} aria-hidden="true">
                    {initials(m.full_name || m.email)}
                  </div>
                  <h2>{m.full_name || t("Без имени")}</h2>
                  <p className={teamStyles.role}>
                    {roleName(m.organization_role)}
                  </p>
                  <p className={teamStyles.email}>{m.email}</p>
                  <p className={teamStyles.access} data-active={m.is_active}>
                    <span aria-hidden="true" />
                    {m.is_active
                      ? t("Доступ включён")
                      : t("Доступ приостановлен")}
                  </p>
                  {team.can_manage && m.is_active && (
                    <Link
                      className={`${styles.primary} ${teamStyles.assign}`}
                      to={`/assignments?user=${m.id}`}
                    >
                      {t("Назначить курс")}
                    </Link>
                  )}
                  {team.can_manage &&
                    m.id !== user?.id &&
                    !m.is_admin &&
                    m.organization_role !== "owner" &&
                    (user?.organization_role === "owner" ||
                      m.organization_role !== "admin") && (
                      <details className={teamStyles.accessActions}>
                        <summary>
                          {t("Роли и области доступа")}
                          <ChevronDown size={16} aria-hidden="true" />
                        </summary>
                        <div>
                          <button
                            className={styles.secondary}
                            disabled={busy}
                            onClick={() =>
                              void perform(async () => {
                                await api.put(`/team/members/${m.id}`, {
                                  organization_id: team.organization!.id,
                                  organization_role: m.organization_role,
                                  is_active: !m.is_active,
                                });
                              })
                            }
                          >
                            {m.is_active
                              ? t("Приостановить доступ")
                              : t("Включить доступ")}
                          </button>
                          <Link
                            className={styles.secondary}
                            to={`/team-settings?user=${m.id}`}
                          >
                            {t("Роли и области доступа")}
                          </Link>
                        </div>
                      </details>
                    )}
                </article>
              ))}
          </div>
          {team.can_manage && (
            <section className={styles.panel}>
              <h2>{t("Приглашения")}</h2>
              <p>
                {t(
                  "До 100 последних записей. Сначала показаны действующие приглашения.",
                )}
              </p>
              {!team.invitations.length ? (
                <p>{t("Приглашений пока нет.")}</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>{t("Состояние")}</th>
                        <th>{t("Срок")}</th>
                        <th>{t("Действие")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.invitations.map((i) => (
                        <tr key={i.id}>
                          <td>{i.email}</td>
                          <td>{t(statuses[i.status] ?? String(i.status))}</td>
                          <td>{dateText(i.expires_at)}</td>
                          <td>
                            {i.status !== "accepted" && (
                              <button
                                className={styles.secondary}
                                disabled={busy}
                                onClick={() =>
                                  void perform(async () => {
                                    const result = await api.post<{
                                      url: string;
                                      mail_status: string;
                                    }>(`/team/invitations/${i.id}/resend`);
                                    setUrl(result.data.url);
                                    setMailStatus(result.data.mail_status);
                                  })
                                }
                              >
                                {t("Выпустить новое приглашение")}
                              </button>
                            )}
                            {i.status === "pending" && (
                              <button
                                className={styles.danger}
                                disabled={busy}
                                onClick={() =>
                                  void perform(async () => {
                                    await api.delete(
                                      `/team/invitations/${i.id}`,
                                    );
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
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </Shell>
  );
}
