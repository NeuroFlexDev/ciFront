import { useLocale } from "@/i18n/useLocale";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { RequestError } from "@/Components/RequestState";
import s from "../Learning/learning.module.css";
export function TeamTabs() {
  const { t } = useLocale();

  return (
    <nav className={s.tablist} aria-label={t("Управление обучением")}>
      {[
        ["/groups", t("Команда и группы")],
        ["/assignments", t("Назначения")],
        ["/programs", t("Программы")],
        ["/learning-analytics", t("Результаты")],
        ["/team-settings", t("Настройки")],
      ].map(([to, label]) => (
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
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const run = async (
    action: () => Promise<unknown>,
    message = t("Изменения сохранены"),
  ) => {
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
