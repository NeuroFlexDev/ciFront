import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { api } from '@/shared/api';
import { ApiError } from '@/shared/errors';
import { useGenerationProgress } from './useGenerationProgress';
vi.mock('@/shared/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const run = (id = 1, status = 'running') => ({
  run_id: id,
  course_id: 8,
  status,
  current_stage: 'lesson_writing',
  progress_percent: 50,
  stages: [],
});
const flush = () =>
  act(async () => {
    await Promise.resolve();
  });

it('retains confirmed progress on network failure and reconnects with backoff, without POST', async () => {
  vi.mocked(api.get)
    .mockResolvedValueOnce({ data: run() })
    .mockRejectedValueOnce(new ApiError('Offline'))
    .mockRejectedValueOnce(new ApiError('Timeout', 0, 'timeout'))
    .mockResolvedValue({ data: { ...run(), progress_percent: 72 } });
  const { result } = renderHook(() => useGenerationProgress(1, 0));
  await flush();
  await act(() => vi.advanceTimersByTimeAsync(2500));
  expect(result.current.connection).toBe('reconnecting');
  expect(result.current.run?.progress_percent).toBe(50);
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(api.get).toHaveBeenCalledTimes(3);
  await act(() => vi.advanceTimersByTimeAsync(9999));
  expect(api.get).toHaveBeenCalledTimes(3);
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(result.current.run?.progress_percent).toBe(72);
  expect(result.current.error).toBeNull();
  expect(result.current.connection).toBe('connected');
  expect(api.post).not.toHaveBeenCalled();
});

it('stops automatic retries for expired session and resumes reads after renewal version', async () => {
  vi.mocked(api.get)
    .mockRejectedValueOnce(new ApiError('Expired', 401))
    .mockResolvedValue({ data: run() });
  const { result, rerender } = renderHook(({ version }) => useGenerationProgress(1, version), {
    initialProps: { version: 0 },
  });
  await flush();
  expect(result.current.connection).toBe('session');
  await act(() => vi.advanceTimersByTimeAsync(60000));
  expect(api.get).toHaveBeenCalledTimes(1);
  rerender({ version: 1 });
  await flush();
  expect(result.current.connection).toBe('connected');
  expect(api.post).not.toHaveBeenCalled();
});

it('clears protected run data when access is revoked and does not auto retry 403', async () => {
  vi.mocked(api.get)
    .mockResolvedValueOnce({ data: run() })
    .mockRejectedValue(new ApiError('Denied', 403));
  const { result } = renderHook(() => useGenerationProgress(1, 0));
  await flush();
  await act(() => vi.advanceTimersByTimeAsync(2500));
  expect(result.current.run).toBeNull();
  expect(result.current.connection).toBe('unavailable');
  await act(() => vi.advanceTimersByTimeAsync(60000));
  expect(api.get).toHaveBeenCalledTimes(2);
});

it('ignores late responses from an old URL and hides the previous run immediately', async () => {
  let resolveOld: (value: { data: ReturnType<typeof run> }) => void = () => {};
  vi.mocked(api.get)
    .mockResolvedValueOnce({ data: run() })
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockResolvedValue({ data: run(2, 'completed') });
  const { result, rerender } = renderHook(({ id }) => useGenerationProgress(id, 0), {
    initialProps: { id: 1 },
  });
  await flush();
  await act(() => vi.advanceTimersByTimeAsync(2500));
  rerender({ id: 2 });
  expect(result.current.run).toBeNull();
  await flush();
  await act(async () => resolveOld({ data: run() }));
  expect(result.current.run?.run_id).toBe(2);
});

it('stops polling terminal runs and rejects a response for a different run', async () => {
  vi.mocked(api.get)
    .mockResolvedValueOnce({ data: run(99) })
    .mockResolvedValue({ data: run(1, 'paused') });
  const { result } = renderHook(() => useGenerationProgress(1, 0));
  await flush();
  expect(result.current.run).toBeNull();
  expect(result.current.connection).toBe('reconnecting');
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(result.current.run?.status).toBe('paused');
  await act(() => vi.advanceTimersByTimeAsync(60000));
  expect(api.get).toHaveBeenCalledTimes(2);
});

it('never schedules another poll after unmount, even when a pending read finishes late', async () => {
  let finish: (value: { data: ReturnType<typeof run> }) => void = () => {};
  vi.mocked(api.get).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { unmount } = renderHook(() => useGenerationProgress(1, 0));
  unmount();
  await act(async () => finish({ data: run() }));
  await act(() => vi.advanceTimersByTimeAsync(60000));
  expect(api.get).toHaveBeenCalledTimes(1);
});
