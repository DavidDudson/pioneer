import { inject, Injectable } from '@angular/core';
import { SessionStore } from '@pioneer/identity/data-access';
import { IdentityContract } from '@pioneer/identity/domain';
import type { SessionSummary } from '@pioneer/identity/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

const sessionListKey = ['identity', 'sessions'] as const;

/**
 * The signed-in user's sessions, for the account page. Revoking one drops just that row from the
 * cache; revoking the current one signs this browser out. Provided per route.
 */
@Injectable()
export class SessionList {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #session = inject(SessionStore);

  public readonly list = injectQuery(() => ({
    queryKey: sessionListKey,
    queryFn: async (): Promise<SessionSummary[]> =>
      this.#api.call(IdentityContract.sessions, { params: {}, body: undefined }),
    enabled: this.#session.user() !== undefined,
  }));

  public async revoke(session: SessionSummary): Promise<void> {
    await this.#api.call(IdentityContract.revokeSession, { params: { id: session.id }, body: undefined });
    // An in-flight refetch could otherwise bring the revoked row back.
    await this.#client.cancelQueries({ queryKey: sessionListKey });
    if (session.current) {
      this.#client.removeQueries({ queryKey: sessionListKey });
      await this.#session.signedOut();
      return;
    }
    this.#client.setQueryData<SessionSummary[]>(sessionListKey, (sessions) =>
      sessions?.filter((each) => each.id !== session.id),
    );
  }

  public async signOutEverywhere(): Promise<void> {
    await this.#session.signOutEverywhere();
    this.#client.removeQueries({ queryKey: sessionListKey });
  }
}
