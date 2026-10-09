import { SESSION_LIFETIME, SessionToken } from '@pioneer/identity/domain';

export const SESSION_COOKIE = 'pioneer_session';

/** Short-lived cookies that carry one sign-in attempt from the login redirect to the callback. */
export const AttemptCookie = {
  State: 'pioneer_oauth_state',
  Verifier: 'pioneer_oauth_verifier',
  ReturnTo: 'pioneer_oauth_return',
} as const;

/** Ten minutes to finish at the provider. */
const ATTEMPT_MAX_AGE_SECONDS = 600;

export interface CookiePolicy {
  /** `Secure` on every cookie; true whenever the public origin is https. */
  readonly secure: boolean;
}

/**
 * HttpOnly so scripts never see them; SameSite=Lax so the provider's top-level redirect back
 * still carries them, while cross-site subrequests do not.
 */
interface CookieValue {
  readonly name: string;
  readonly value: string;
  readonly maxAge: number;
}

function cookie(policy: CookiePolicy, { name, value, maxAge }: CookieValue): string {
  return new Bun.Cookie(name, value, {
    path: '/',
    httpOnly: true,
    secure: policy.secure,
    sameSite: 'lax',
    maxAge,
  }).serialize();
}

export function sessionCookie(policy: CookiePolicy, token: SessionToken): string {
  return cookie(policy, { name: SESSION_COOKIE, value: token, maxAge: SESSION_LIFETIME.total('seconds') });
}

export function attemptCookie(policy: CookiePolicy, name: string, value: string): string {
  return cookie(policy, { name, value, maxAge: ATTEMPT_MAX_AGE_SECONDS });
}

/** Expires a cookie in the browser. */
export function clearedCookie(policy: CookiePolicy, name: string): string {
  return cookie(policy, { name, value: '', maxAge: 0 });
}

/** Cookie values sent with a request. */
export function requestCookies(request: Request): Bun.CookieMap {
  return new Bun.CookieMap(request.headers.get('cookie') ?? '');
}

/** The session token a request carries, if it is well-formed. */
export function sessionToken(request: Request): SessionToken | undefined {
  const parsed = SessionToken.safeParse(requestCookies(request).get(SESSION_COOKIE));
  return parsed.success ? parsed.data : undefined;
}
