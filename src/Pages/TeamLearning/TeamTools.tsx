import { useLocale } from "@/i18n/useLocale";
import { useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { RequestError } from "@/Components/RequestState";
import s from "../Learning/learning.module.css";
import { useAuth } from '@/auth/useAuth';
import { isBusiness } from '@/shared/business';
export function TeamTabs() {
  const { t } = useLocale();
  const { user } = useAuth();

  return (
    <nav
      className={`${s.tablist} ${s.teamNavigation}`}
      aria-label={t("Управление обучением")}
    >
      {(isBusiness(user) ? [
        ['/company', t('Дашборд')], ['/company?tab=employees', t('Персонал')],
        ['/learning-analytics', t('Результаты')],
        ...(user?.organization_role === 'owner' ? [['/team-settings', t('Настройки')]] : []),
      ] : [
        ["/groups", t("Команда и группы")],
        ["/assignments", t("Назначения")],
        ["/programs", t("Программы")],
        ["/learning-analytics", t("Результаты")],
        ["/team-settings", t("Настройки")],
      ]).map(([to, label]) => (
        <NavLink key={to} to={to}>
          {t(String(label))}
        </NavLink>
      ))}
    </nav>
  );
}
// Kept beside the status component so callers share one action/error contract.
// eslint-disable-next-line react-refresh/only-export-components
export function useTeamAction() {
  const { t } = useLocale();

  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const run = async (
    action: () => Promise<unknown>,
    message = t("Изменения сохранены"),
  ) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      await action();
      setNotice(message);
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return { busy, error, notice, run, setNotice };
}
export function ActionStatus({
  action,
}: {
  action: ReturnType<typeof useTeamAction>;
}) {
  return (
    <>
      {!!action.error && <RequestError error={action.error} />}{" "}
      {action.notice && (
        <p className={s.notice} role="status">
          {action.notice}
        </p>
      )}
    </>
  );
}
