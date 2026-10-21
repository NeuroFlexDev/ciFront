import { useState } from "react";
import { NavLink } from "react-router-dom";
import { RequestError } from "@/Components/RequestState";
import s from "../Learning/learning.module.css";
export function TeamTabs() {
  return (
    <nav className={s.tablist} aria-label="Управление обучением">
      {[
        ["/groups", "Команда и группы"],
        ["/assignments", "Назначения"],
        ["/programs", "Программы"],
        ["/learning-analytics", "Результаты"],
        ["/team-settings", "Настройки"],
      ].map(([to, label]) => (
        <NavLink key={to} to={to}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
// Kept beside the status component so callers share one action/error contract.
// eslint-disable-next-line react-refresh/only-export-components
export function useTeamAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const run = async (
    action: () => Promise<unknown>,
    message = "Изменения сохранены",
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
