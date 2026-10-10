import { computed, DOCUMENT, inject, Injectable } from '@angular/core';
import type { Signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthPath, IdentityContract, RETURN_TO_PARAM, returnPathOr, SIGN_IN_PATH } from '@pioneer/identity/domain';
import type { OAuthProvider, ReturnPath, User } from '@pioneer/identity/domain';
import { API_BASE_URL, ApiClient, ApiError } from '@pioneer/shared/web';
import { hashKey, injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

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
  /** The sign-in prompt under way, if any. */
  #prompting: Promise<void> | undefined;

  readonly #me = injectQuery(() => ({
    queryKey: sessionKeys.me,
    queryFn: async (): Promise<SessionState> => this.#fetchMe(),
  }));

  /** The signed-in user; `undefined` while unknown or signed out. */
  public readonly user: Signal<User | undefined> = computed(() => this.#me.data()?.user);
  /** True once the server has answered, either way. */
  public readonly known: Signal<boolean> = computed(() => this.#me.data() !== undefined);

  /** The signed-in user once the server has answered (at once if it already has); `undefined` when signed out. */
  public async whenKnown(): Promise<User | undefined> {
    const state = await this.#client.query({
      queryKey: sessionKeys.me,
      queryFn: async () => this.#fetchMe(),
      staleTime: 'static',
    });
    return state.user;
  }

  /** Opens the sign-in page, which comes back to the current page afterwards. */
  public async showSignIn(): Promise<void> {
    const returnTo = returnPathOr(this.#router.url);
    await this.#router.navigate([SIGN_IN_PATH], { queryParams: { [RETURN_TO_PARAM]: returnTo } });
  }

  /**
   * The server answered 401 to a call that needed a session: it expired or was revoked. Forget
   * the user and offer sign-in, unless the sign-in page is already showing.
   */
  public async promptSignIn(): Promise<void> {
    // Calls often fail together (a page's list and detail); they share one prompt.
    this.#prompting ??= this.#promptOnce();
    return this.#prompting;
  }

  /** Leaves for the provider, returning to `returnTo` afterwards. */
  public signIn(provider: OAuthProvider, returnTo: ReturnPath): void {
    this.signInAt(AuthPath.login(provider), returnTo);
  }

  /**
   * Leaves for an API sign-in navigation at `path` (relative to the API base), which sets the session cookie and
   * redirects to `returnTo`. Providers use `signIn`; the dev users' one-click sign-in uses this directly.
   */
  public signInAt(path: `/auth/${string}`, returnTo: ReturnPath): void {
    const query = new URLSearchParams({ [RETURN_TO_PARAM]: returnTo });
    this.#document.location.assign(`${this.#baseUrl}${path}?${query.toString()}`);
  }

  /** Ends this browser's session; a page that needs an account then sends it to sign-in. */
  public async signOut(): Promise<void> {
    await this.#api.call(IdentityContract.signOut, { params: {}, body: undefined });
    await this.signedOut();
    await this.#recheckAccess();
  }

  /** Ends every session this user has, here and on other devices. */
  public async signOutEverywhere(): Promise<void> {
    await this.#api.call(IdentityContract.signOutEverywhere, { params: {}, body: undefined });
    await this.signedOut();
    await this.#recheckAccess();
  }

  /**
   * Records that the server ended this browser's session, e.g. after it revoked the current one.
   * Everything cached was the signed-out user's, so it all goes.
   */
  public async signedOut(): Promise<void> {
    // A /me answer still in flight would otherwise sign the user back in.
    await this.#client.cancelQueries({ queryKey: sessionKeys.me });
    const me = hashKey(sessionKeys.me);
    this.#client.removeQueries({ predicate: (query) => query.queryHash !== me });
    this.#client.setQueryData<SessionState>(sessionKeys.me, { user: undefined });
  }

  async #promptOnce(): Promise<void> {
    try {
      await this.#prompt();
    } finally {
      this.#prompting = undefined;
    }
  }

  async #prompt(): Promise<void> {
    await this.signedOut();
    const path = this.#router.parseUrl(this.#router.url).root.children['primary']?.toString();
    if (`/${path ?? ''}` !== SIGN_IN_PATH) {
      await this.showSignIn();
    }
  }

  /**
   * Runs the current page's guards again (routes that need an account set
   * `runGuardsAndResolvers: 'always'`), so it is left once nobody is signed in.
   */
  async #recheckAccess(): Promise<void> {
    await this.#router.navigateByUrl(this.#router.url, { onSameUrlNavigation: 'reload' });
  }

  async #fetchMe(): Promise<SessionState> {
    try {
      const user = await this.#api.call(IdentityContract.me, { params: {}, body: undefined, signedOutIsAnswer: true });
      return { user };
    } catch (error: unknown) {
      if (ApiError.isUnauthorized(error)) {
        return { user: undefined };
      }
      throw error;
    }
  }
}
