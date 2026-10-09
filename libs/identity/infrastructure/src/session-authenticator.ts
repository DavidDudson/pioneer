import type { Authenticated, IdentityService } from '@pioneer/identity/application';
import type { UserId } from '@pioneer/shared/kernel';
import { RequestAuthenticator } from '@pioneer/shared/server';
import type { RequestExchange } from '@pioneer/shared/server';

import { sessionCookie, sessionToken } from './session-cookie';
import type { CookiePolicy } from './session-cookie';

/** Authenticates requests by their session cookie, for identity's routes and every other context's. */
export class SessionAuthenticator extends RequestAuthenticator {
  readonly #service: IdentityService;
  readonly #policy: CookiePolicy;

  public constructor(service: IdentityService, policy: CookiePolicy) {
    super();
    this.#service = service;
    this.#policy = policy;
  }

  /**
   * The request's session, or a 401. A session renewed by this request gets its cookie re-issued,
   * so the browser keeps it as long as the server does.
   */
  public async signedIn({ request, responseHeaders }: RequestExchange): Promise<Authenticated> {
    const token = sessionToken(request);
    const authenticated = await this.#service.requireSession(token);
    if (authenticated.renewed && token !== undefined) {
      responseHeaders['set-cookie'] = sessionCookie(this.#policy, token);
    }
    return authenticated;
  }

  public override async actingUser(exchange: RequestExchange): Promise<UserId> {
    const { user } = await this.signedIn(exchange);
    return user.id;
  }
}
