import { describe, it, expect, vi } from 'vitest';
import { sameWebSession, shouldRenewWebSession } from '@/shared/webSession';
import {
  bindAuthSession,
  captureAuthSession,
  authSessionIsCurrent,
  setAuthToken,
  renewAuthToken,
  authSessionChanged,
  getAuthToken,
  apiFetch,
} from '@/shared/api';
const now = 1_800_000_000_000;
const token = (patch: Record<string, unknown> = {}) =>
  'header.' +
  btoa(
    JSON.stringify({
      sub: '21',
      aud: 'lernium:platform',
      ver: 2,
      wsid: 'login-a',
      wsa: now / 1000 - 600,
      iat: now / 1000 - 600,
      exp: now / 1000 + 120,
      amr: ['pwd'],
      ...patch,
    }),
  ) +
  '.signature';
describe('active web session', () => {
  it('a late 401 from an older token does not expire an already rotated session or replay a write', async()=>{
    localStorage.clear(); setAuthToken(token());
    const release=bindAuthSession(),expired=vi.fn();
    let complete!:(value:Response)=>void;
    const fetchMock=vi.fn(()=>new Promise<Response>(resolve=>{complete=resolve;}));
    vi.stubGlobal('fetch',fetchMock);window.addEventListener('lernium-session-expired',expired);
    try {
      const stamp=captureAuthSession();const request=apiFetch('/profile',{method:'PATCH',body:'{}'});
      renewAuthToken(token({exp:now/1000+900}),stamp);
      complete(new Response('{}',{status:401}));
      expect((await request).status).toBe(401);expect(expired).not.toHaveBeenCalled();expect(fetchMock).toHaveBeenCalledOnce();
    }finally{window.removeEventListener('lernium-session-expired',expired);vi.unstubAllGlobals();release();localStorage.clear();}
  });
  it('renews only active, unexpired sessions close to expiry', () => {
    expect(shouldRenewWebSession(token(), now, now - 1000)).toBe(true);
    expect(shouldRenewWebSession(token(), now, now - 6 * 60_000)).toBe(false);
    expect(shouldRenewWebSession(token({ exp: now / 1000 - 1 }), now, now)).toBe(false);
    expect(shouldRenewWebSession(token({ exp: now / 1000 + 600 }), now, now)).toBe(false);
    expect(shouldRenewWebSession(token({ wsa: now / 1000 - 9 * 3600 }), now, now)).toBe(false);
    expect(shouldRenewWebSession('old-session', now, now)).toBe(false);
  });
  it('distinguishes another login, account, surface, version and MFA proof', () => {
    expect(sameWebSession(token(), token({ exp: now / 1000 + 900 }))).toBe(true);
    for (const changed of [
      { sub: '22' },
      { wsid: 'login-b' },
      { aud: 'lernium:admin' },
      { ver: 3 },
      { mfa_at: 1 },
      { wsa: 0 },
      { amr: ['oidc'] },
    ])
      expect(sameWebSession(token(), token(changed))).toBe(false);
  });
  it('rotation keeps in-flight responses in the same account; account switch still invalidates them', () => {
    localStorage.clear();
    setAuthToken(token());
    const release = bindAuthSession();
    try {
      const pending = captureAuthSession(),
        rotated = token({ exp: now / 1000 + 900 });
      renewAuthToken(rotated, pending);
      expect(authSessionIsCurrent(pending)).toBe(true);
      expect(getAuthToken()).toBe(rotated);
      expect(() => renewAuthToken(token({ sub: '22' }), pending)).toThrow();
      localStorage.setItem('lernium_auth_token', token({ wsid: 'different-login' }));
      expect(authSessionChanged()).toBe(true);
      expect(authSessionIsCurrent(pending)).toBe(false);
    } finally {
      release();
      localStorage.clear();
    }
  });
});
