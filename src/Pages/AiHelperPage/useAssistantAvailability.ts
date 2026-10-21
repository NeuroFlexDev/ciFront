import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { useReconnect } from "@/hooks/useReconnect";
import { api } from "@/shared/api";

type Usage = {
  chat_monthly_limit: number;
  interactive_requests_this_month: number;
  interactive_requests_admission_total?: number;
  interactive_requests_own_legacy_unattributed?: number;
};
type Availability = {
  context: string;
  status: "loading" | "ready" | "error";
  reason: string | null;
};
const loadingReason = "Проверяем доступность помощника…";

/** A read-only hint, not an admission reservation. The send API remains authoritative. */
export function useAssistantAvailability() {
  const { user } = useAuth();
  const organizationId = user?.organization_id;
  const context = `${user?.id ?? "unknown"}:${organizationId ?? "personal"}`;
  const [state, setState] = useState<Availability>({
    context,
    status: "loading",
    reason: loadingReason,
  });
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const request = ++sequence.current;
    setState({ context, status: "loading", reason: loadingReason });
    try {
      const [settings, usage] = await Promise.all([
        organizationId
          ? api.get<{ features: Record<string, boolean> }>("/team/settings")
          : Promise.resolve(null),
        api.get<Usage>("/materials/resource-usage"),
      ]);
      const data = usage.data;
      // Older servers expose only the confirmed count; newer ones include
      // legacy uncertainty in the exact admission total. Do not drop that total.
      const used = data?.interactive_requests_admission_total ?? (
        data?.interactive_requests_this_month +
        (data?.interactive_requests_own_legacy_unattributed ?? 0)
      );
      if (
        !data || !Number.isFinite(data.chat_monthly_limit) ||
        data.chat_monthly_limit < 0 || !Number.isFinite(used) || used < 0 ||
        (settings && (
          !settings.data?.features ||
          typeof settings.data.features !== "object" ||
          Array.isArray(settings.data.features)
        ))
      ) {
        throw new Error("Invalid assistant availability response");
      }
      const reason = settings?.data.features.assistant === false
        ? "Помощник отключён в настройках вашей организации. Обратитесь к администратору."
        : data.chat_monthly_limit === 0
          ? "Установлен нулевой лимит запросов к помощнику. Обратитесь к администратору."
          : used >= data.chat_monthly_limit
            ? "Месячный лимит запросов к помощнику исчерпан. Обратитесь к администратору или дождитесь нового расчётного месяца."
            : null;
      if (request === sequence.current) {
        setState({ context, status: "ready", reason });
      }
    } catch {
      if (request === sequence.current) {
        setState({
          context,
          status: "error",
          reason: "Не удалось проверить доступность помощника. Обновите проверку перед отправкой.",
        });
      }
    }
  }, [context, organizationId]);
  useEffect(() => {
    void reload();
    return () => { sequence.current++; };
  }, [reload]);
  useReconnect(() => void reload());
  const current: Availability = state.context === context ? state : {
    context,
    status: "loading",
    reason: loadingReason,
  };
  return {
    ...current,
    blocked: current.status !== "ready" || current.reason !== null,
    reload,
  };
}

export type AssistantAvailability = ReturnType<typeof useAssistantAvailability>;
