import { useEffect, useState } from 'react';
import { api } from '@/shared/api';
import { ApiError } from '@/shared/errors';
import {
  generationActive,
  type GenerationConnection,
  type GenerationRun,
} from '@/Components/ExpressComponents/GenerationProgress/types';

type Snapshot = {
  id: number;
  run: GenerationRun | null;
  error: unknown;
  connection: GenerationConnection;
  receivedAt: number | null;
};

/** Reconnect only reads. A transport failure must never replay a paid mutation. */
export function useGenerationProgress(runId: number | null, version: number) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  useEffect(() => {
    if (!runId) return;
    let active = true;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const { data } = await api.get<GenerationRun>(`/generation-runs/${runId}`);
        if (!active) return;
        if (data.run_id !== runId || !Array.isArray(data.stages))
          throw new ApiError('Сервер прислал неполный ответ о генерации.', 502, 'invalid_response');
        failures = 0;
        setSnapshot({
          id: runId,
          run: data,
          error: null,
          connection: 'connected',
          receivedAt: Date.now(),
        });
        if (generationActive(data)) timer = setTimeout(poll, 2500);
      } catch (error) {
        if (!active) return;
        const status = error instanceof ApiError ? error.status : 0;
        const denied = status === 403 || status === 404;
        setSnapshot((previous) => ({
          id: runId,
          run: !denied && previous?.id === runId ? previous.run : null,
          receivedAt: previous?.id === runId ? previous.receivedAt : null,
          error,
          connection:
            status === 401
              ? 'session'
              : denied || (status >= 400 && status < 500 && status !== 429)
                ? 'unavailable'
                : 'reconnecting',
        }));
        if (!status || status >= 500 || status === 429) {
          failures += 1;
          timer = setTimeout(
            poll,
            status === 429 ? 30000 : Math.min(30000, 2500 * 2 ** Math.min(failures, 4)),
          );
        }
      }
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [runId, version]);
  return snapshot?.id === runId
    ? snapshot
    : { run: null, error: null, connection: 'loading' as const, receivedAt: null };
}
