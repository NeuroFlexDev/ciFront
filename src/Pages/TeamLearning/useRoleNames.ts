import { useEffect } from "react";
import { useAuth } from "@/auth/useAuth";
import { useLocale } from "@/i18n/useLocale";
import { useLearningData } from "../Learning/useLearningData";
import { roles, type TeamSettings } from "./types";

const profileRoles: Record<string, Record<string, string>> = {
  business: { author: "Наставник", manager: "Руководитель", admin: "Руководитель", member: "Сотрудник", candidate: "Кандидат" },
  education: {
    author: "Преподаватель",
    reviewer: "Методист",
    member: "Студент",
  },
  training_center: { author: "Ведущий", member: "Слушатель" },
};
export function useRoleNames() {
  const { user } = useAuth(),
    { locale, t } = useLocale();
  const query = useLearningData<Pick<TeamSettings, "profile" | "role_labels">>(
    user?.organization_id
      ? `/team/settings?workspace=${user.organization_id}`
      : null,
  );
  const { reload } = query;
  useEffect(() => {
    const changed = () => void reload();
    window.addEventListener("lernium-team-settings-changed", changed);
    return () =>
      window.removeEventListener("lernium-team-settings-changed", changed);
  }, [reload]);
  return (role: string) => {
    const labels = query.data?.role_labels ?? {};
    // Custom labels are organization content; never machine-translate them or use
    // them to decide access. All mutations continue to send the stable role id.
    return (
      labels[`${role}_${locale}`]?.trim() ||
      labels[role]?.trim() ||
      t(profileRoles[user?.organization_kind === 'business' ? 'business' : query.data?.profile ?? ""]?.[role] ?? roles[role] ?? role)
    );
  };
}
