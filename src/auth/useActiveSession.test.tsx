import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiFetch, getAuthToken, renewAuthToken } from '@/shared/api';
import { useActiveSession } from './useActiveSession';
import { useSessionWork } from './useSessionWork';

vi.mock('@/shared/api', () => ({
  apiFetch: vi.fn(),
  getAuthToken: vi.fn(),
  renewAuthToken: vi.fn(),
  captureAuthSession: () => ({ generation: 1, storedToken: currentToken }),
}));
const start = 1_800_000_000_000;
let currentToken = '';
const token = (ageHours = 0) =>
  `header.${btoa(
    JSON.stringify({
      sub: '21',
      aud: 'lernium:platform',
      ver: 1,
      wsid: 'work-session',
      wsa: start / 1000 - ageHours * 3600,
      exp: Date.now() / 1000 + 900,
    }),
  )}.signature`;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(start);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  currentToken = token();
  vi.mocked(getAuthToken).mockImplementation(() => currentToken);
  vi.mocked(renewAuthToken).mockImplementation((next) => {
    currentToken = next;
  });
  vi.mocked(apiFetch).mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          user: { id: 21 },
          access_token: token(),
        }),
      ),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function workspace(working = true, userId = 21) {
  return renderHook(
    ({ pending }) => {
      useSessionWork(21, pending);
      useActiveSession(userId);
    },
    { initialProps: { pending: working } },
  );
}

it('keeps a visible generation session valid during twenty minutes without input', async () => {
  workspace();
  await act(() => vi.advanceTimersByTimeAsync(20 * 60_000));
  expect(apiFetch).toHaveBeenCalledOnce();
  expect(apiFetch).toHaveBeenCalledWith('/auth/renew', expect.objectContaining({ method: 'POST' }));
  expect(renewAuthToken).toHaveBeenCalledOnce();
});

it('does not prolong an idle page or work belonging to another account', async () => {
  const idle = workspace(false);
  await act(() => vi.advanceTimersByTimeAsync(20 * 60_000));
  idle.unmount();
  currentToken = token();
  workspace(true, 22);
  await act(() => vi.advanceTimersByTimeAsync(20 * 60_000));
  expect(apiFetch).not.toHaveBeenCalled();
});

it('stops counting work when it pauses, finishes or leaves the page', async () => {
  const view = workspace();
  await act(() => vi.advanceTimersByTimeAsync(6 * 60_000));
  view.rerender({ pending: false });
  await act(() => vi.advanceTimersByTimeAsync(14 * 60_000));
  expect(apiFetch).not.toHaveBeenCalled();
  view.unmount();
  currentToken = token();
  workspace(false);
  await act(() => vi.advanceTimersByTimeAsync(20 * 60_000));
  expect(apiFetch).not.toHaveBeenCalled();
});

it('does not renew in the background and checks promptly when returning before expiry', async () => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  workspace();
  await act(() => vi.advanceTimersByTimeAsync(13 * 60_000));
  expect(apiFetch).not.toHaveBeenCalled();
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(renewAuthToken).toHaveBeenCalledOnce();
});

it('requires reauthentication after expiry or the absolute eight-hour limit', async () => {
  currentToken = token(9);
  const view = workspace();
  await act(() => vi.advanceTimersByTimeAsync(13 * 60_000));
  expect(apiFetch).not.toHaveBeenCalled();
  view.unmount();
  currentToken = token();
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  workspace();
  await act(() => vi.advanceTimersByTimeAsync(16 * 60_000));
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
  });
  expect(apiFetch).not.toHaveBeenCalled();
});
