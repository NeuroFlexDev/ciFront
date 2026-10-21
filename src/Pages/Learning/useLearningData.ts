import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/shared/api";
import { useReconnect } from "@/hooks/useReconnect";

/** Reads may reconnect automatically; writes always remain explicit. */
export function useLearningData<T>(path: string | null) {
  const [state, setState] = useState<{
    path: string | null;
    data: T | null;
    error: unknown;
    loading: boolean;
  }>({ path: null, data: null, error: null, loading: false });
  const sequence = useRef(0);
  const invalidate = useCallback(() => {
    sequence.current++;
  }, []);
  const reload = useCallback(async () => {
    const token = ++sequence.current;
    if (!path) {
      setState({ path: null, data: null, error: null, loading: false });
      return;
    }
    setState((old) => ({
      path,
      data: old.path === path ? old.data : null,
      error: null,
      loading: true,
    }));
    try {
      const result = await api.get<T>(path);
      if (token === sequence.current)
        setState({ path, data: result.data, error: null, loading: false });
    } catch (error) {
      if (token === sequence.current)
        setState((old) => ({ ...old, path, error, loading: false }));
    }
  }, [path]);
  useEffect(() => {
    void reload();
    return invalidate;
  }, [reload, invalidate]);
  useReconnect(() => {
    void reload();
  });
  return {
    data: state.path === path ? state.data : null,
    error: state.path === path ? state.error : null,
    loading: !!path && (state.path !== path || state.loading),
    reload,
  };
}
