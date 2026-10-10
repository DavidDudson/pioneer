import type { IdentityService } from '@pioneer/identity/application';
import { DEV_USERS, DevSignInPath } from '@pioneer/identity/dev-users';
import { RETURN_TO_PARAM, returnPathOr } from '@pioneer/identity/domain';
import { sessionCookie } from '@pioneer/identity/infrastructure';
import type { CookiePolicy } from '@pioneer/identity/infrastructure';
import { ForbiddenError, NotFoundError } from '@pioneer/shared/kernel';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { isCrossSiteRequest } from './local-only';

const FOUND = 302;

/** What the dev sign-in needs from identity. */
interface DevSignInDeps {
  readonly service: IdentityService;
  readonly policy: CookiePolicy;
}

/**
 * One-click sign-in as a seeded dev user: starts a session like a provider callback would and redirects to
 * `returnTo`. Only seeded ids are accepted; anything else is a 404. Cross-site requests are a 403: the ids are
 * public, so this stands in for the OAuth state check against login CSRF. Mounted by the dev entrypoint alone, so the
 * production binary never contains it.
 */
export function devSignInRoutes({ service, policy }: DevSignInDeps): AnyElysia {
  return new Elysia({ name: 'dev-sign-in' }).get(DevSignInPath.route, async ({ params, request }) => {
    if (isCrossSiteRequest(request)) {
      throw new ForbiddenError('Dev sign-in from another site');
    }
    const user = DEV_USERS.find(({ id }) => id === params.userId);
    if (user === undefined) {
      throw new NotFoundError('DevUser', params.userId);
    }
    const { token } = await service.startSession(user.id);
    const returnTo = returnPathOr(new URL(request.url).searchParams.get(RETURN_TO_PARAM));
    const headers = new Headers({ location: returnTo, 'cache-control': 'no-store' });
    headers.append('set-cookie', sessionCookie(policy, token));
    return new Response(undefined, { status: FOUND, headers });
  });
}
