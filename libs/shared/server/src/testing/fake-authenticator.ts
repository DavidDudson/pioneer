import { UnauthorizedError, UserId } from '@pioneer/shared/kernel';

import { RequestAuthenticator } from '../request-authenticator';
import type { RequestExchange } from '../request-authenticator';

/** Test-only header naming the acting user; real requests authenticate with the session cookie. */
const TEST_USER_HEADER = 'x-test-user';

/** Headers that make `FakeAuthenticator` treat a request as sent by `user`. */
export function actingAs(user: UserId): Record<string, string> {
  return { [TEST_USER_HEADER]: user };
}

/** Authenticates whoever `actingAs` names; a request without it is a 401, like a missing session. */
export class FakeAuthenticator extends RequestAuthenticator {
  readonly #header = TEST_USER_HEADER;

  public override async actingUser({ request }: RequestExchange): Promise<UserId> {
    const header = request.headers.get(this.#header);
    if (header === null) {
      throw new UnauthorizedError();
    }
    return UserId.parse(header);
  }
}
