type Claims = {
  sub: string;
  aud: string;
  ver: number;
  wsid: string;
  wsa: number;
  iat: number;
  exp: number;
  amr?: string[];
  mfa_at?: number;
};
export function webSessionClaims(token: string | null): Claims | null {
  if (!token) return null;
  try {
    const segment = token.split('.')[1];
    const claims = JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof claims.wsid === 'string' &&
      typeof claims.sub === 'string' &&
      typeof claims.aud === 'string' &&
      Number.isInteger(claims.ver) &&
      Number.isFinite(claims.exp) &&
      Number.isInteger(claims.wsa) &&
      !claims.sid
      ? claims
      : null;
  } catch {
    return null;
  }
}
// This identifies already authenticated rotations; it is never an authorization check.
export function sameWebSession(left: string | null, right: string | null): boolean {
  if (left === right) return true;
  const a = webSessionClaims(left),
    b = webSessionClaims(right);
  return (
    !!a &&
    !!b &&
    a.wsid === b.wsid &&
    a.sub === b.sub &&
    a.aud === b.aud &&
    a.ver === b.ver &&
    a.wsa === b.wsa &&
    a.mfa_at === b.mfa_at &&
    JSON.stringify(a.amr) === JSON.stringify(b.amr)
  );
}
export function shouldRenewWebSession(
  token: string | null,
  now: number,
  lastActivity: number,
): boolean {
  const claims = webSessionClaims(token);
  return (
    !!claims &&
    now - lastActivity < 5 * 60_000 &&
    claims.exp * 1000 > now &&
    claims.exp * 1000 - now < 5 * 60_000 &&
    now - claims.wsa * 1000 < 8 * 60 * 60_000
  );
}
