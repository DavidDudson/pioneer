import { computed, DOCUMENT, inject, Injectable } from '@angular/core';
import type { Signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthPath, IdentityContract, RETURN_TO_PARAM, returnPathOr, SIGN_IN_PATH } from '@pioneer/identity/domain';
import type { OAuthProvider, ReturnPath, User } from '@pioneer/identity/domain';
import { API_BASE_URL, ApiClient, ApiError } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

const sessionKeys = { me: ['identity', 'me'] as const };

/** What the server says about this browser: signed in as `user`, or signed out. */
interface SessionState {
  readonly user: User | undefined;
}

/**
 * The signed-in user, app-wide. Asks `/api/me` once; a 401 means signed out. Sign-in is a full
 * page navigation to the provider, so it comes back to a fresh app that asks again.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #document = inject(DOCUMENT);
  readonly #router = inject(Router);
  readonly #baseUrl = inject(API_BASE_URL);

  readonly #me = injectQuery(() => ({
    queryKey: sessionKeys.me,
    queryFn: async (): Promise<SessionState> => {
      try {
        return { user: await this.#api.call(IdentityContract.me, { params: {}, body: undefined }) };
      } catch (error: unknown) {
        if (ApiError.isUnauthorized(error)) {
          return { user: undefined };
        }
        throw error;
      }
    },
  }));

  /** The signed-in user; `undefined` while unknown or signed out. */
  public readonly user: Signal<User | undefined> = computed(() => this.#me.data()?.user);
  /** True once the server has answered, either way. */
  public readonly known: Signal<boolean> = computed(() => this.#me.data() !== undefined);

  /** Opens the sign-in page, which comes back to the current page afterwards. */
  public async showSignIn(): Promise<void> {
    const returnTo = returnPathOr(this.#router.url);
    await this.#router.navigate([SIGN_IN_PATH], { queryParams: { [RETURN_TO_PARAM]: returnTo } });
  }

  /** Leaves for the provider, returning to `returnTo` afterwards. */
  public signIn(provider: OAuthProvider, returnTo: ReturnPath): void {
    const query = new URLSearchParams({ [RETURN_TO_PARAM]: returnTo });
    this.#document.location.assign(`${this.#baseUrl}${AuthPath.login(provider)}?${query.toString()}`);
  }

  public async signOut(): Promise<void> {
    await this.#api.call(IdentityContract.signOut, { params: {}, body: undefined });
    this.#client.setQueryData<SessionState>(sessionKeys.me, { user: undefined });
  }
}
