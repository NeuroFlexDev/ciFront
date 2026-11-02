import { useEffect } from 'react';
import { apiFetch, getAuthToken, renewAuthToken, captureAuthSession } from '@/shared/api';
import { shouldRenewWebSession } from '@/shared/webSession';

export function useActiveSession(userId: number | undefined) {
  useEffect(() => {
    if (!userId) return;
    let active = true,
      busy = false,
      lastActivity = Date.now(),
      lastAttempt = 0;
    const controller = new AbortController();
    const check = async () => {
      const now = Date.now();
      if (
        !active ||
        busy ||
        document.visibilityState !== 'visible' ||
        now - lastAttempt < 60_000 ||
        !shouldRenewWebSession(getAuthToken(), now, lastActivity)
      )
        return;
      busy = true;
      lastAttempt = now;
      const session = captureAuthSession();
      try {
        const response = await apiFetch('/auth/renew', {
          method: 'POST',
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          if (active && data.user?.id === userId && typeof data.access_token === 'string')
            renewAuthToken(data.access_token, session);
        } else if (response.status === 401 && active && getAuthToken() === session.storedToken)
          window.dispatchEvent(new Event('lernium-session-expired'));
      } catch {
        /* Keep the current credential and local work during an outage. */
      } finally {
        busy = false;
      }
    };
    const activity = () => {
      lastActivity = Date.now();
      void check();
    };
    const events = ['pointerdown', 'keydown', 'scroll'] as const;
    for (const event of events) window.addEventListener(event, activity, { passive: true });
    const timer = window.setInterval(() => void check(), 30_000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      for (const event of events) window.removeEventListener(event, activity);
    };
  }, [userId]);
}
