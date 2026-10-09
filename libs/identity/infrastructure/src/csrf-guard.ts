import { ForbiddenError } from '@pioneer/shared/kernel';
import { Elysia } from 'elysia';

import { requestCookies, SESSION_COOKIE } from './session-cookie';

/** Methods that change nothing, so a cross-site request can do no harm with them. */
const SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * True for a state-changing request that carries the session cookie but did not come from this
 * origin. Fetch metadata decides when the browser sends it (`Sec-Fetch-Site: same-origin` only);
 * otherwise `Origin` must match. A page can forge neither. Requests without the cookie act as
 * nobody and are let through.
 */
export function isCrossSiteWrite(request: Request, publicOrigin: string | undefined): boolean {
  if (SAFE_METHODS.has(request.method) || !requestCookies(request).has(SESSION_COOKIE)) {
    return false;
  }
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite !== null) {
    return fetchSite !== 'same-origin';
  }
  const expected = new URL(publicOrigin ?? request.url).origin;
  return request.headers.get('origin') !== expected;
}

/**
 * Rejects cross-site writes with a 403 problem before any handler runs. SameSite=Lax already keeps
 * the cookie off most cross-site subrequests; this also covers same-site attackers and old browsers.
 * `publicOrigin` is the site's origin; without one, the request's own origin.
 */
export function csrfGuard(publicOrigin: string | undefined): Elysia {
  return new Elysia({ name: 'csrf-guard' }).onBeforeHandle({ as: 'global' }, ({ request }) => {
    if (isCrossSiteWrite(request, publicOrigin)) {
      throw new ForbiddenError(`Cross-site ${request.method} ${new URL(request.url).pathname} refused`);
    }
  });
}
