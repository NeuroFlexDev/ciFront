export type MFAChallengeResponse = {mfa_required:true;challenge_token:string;expires_at:string};
export function isMFAChallenge(value:unknown): value is MFAChallengeResponse {
  return typeof value==='object' && value!==null && 'mfa_required' in value && value.mfa_required===true &&
    'challenge_token' in value && typeof value.challenge_token==='string' && 'expires_at' in value && typeof value.expires_at==='string';
}
export class MFAChallengeError extends Error {
  constructor(public challenge:MFAChallengeResponse){super('Подтвердите двухэтапный вход');this.name='MFAChallengeError';}
}

