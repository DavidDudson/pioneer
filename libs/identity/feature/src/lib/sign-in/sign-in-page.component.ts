import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncData, AsyncPending, AsyncRegion, Button, EmptyState, Page, Skeleton, Stack } from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';
import { IdentityContract, OAuthProvider, returnPathOr } from '@pioneer/identity/domain';
import type { ReturnPath } from '@pioneer/identity/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery } from '@tanstack/angular-query-experimental';

/** Button text per provider, spelled out so the message check sees every key. */
const CONTINUE_WITH = {
  [OAuthProvider.GitHub]: 'identity.signIn.continueWith.github',
  [OAuthProvider.Discord]: 'identity.signIn.continueWith.discord',
  [OAuthProvider.Google]: 'identity.signIn.continueWith.google',
} as const satisfies Record<OAuthProvider, string>;

/** One button per configured provider; each leaves for that provider and comes back to `returnTo`. */
@Component({
  selector: 'pio-sign-in-page',
  imports: [AsyncData, AsyncPending, AsyncRegion, Button, EmptyState, Page, Skeleton, Stack, TranslocoPipe],
  templateUrl: './sign-in-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  /** From the `returnTo` query parameter; anything off-site falls back home. */
  public readonly returnTo = input<string | undefined>(undefined);

  protected readonly session = inject(SessionStore);
  readonly #api = inject(ApiClient);
  protected readonly continueWith = CONTINUE_WITH;
  protected readonly destination = computed<ReturnPath>(() => returnPathOr(this.returnTo()));
  protected readonly providers = injectQuery(() => ({
    queryKey: ['identity', 'providers'] as const,
    queryFn: async (): Promise<OAuthProvider[]> =>
      this.#api.call(IdentityContract.providers, { params: {}, body: undefined }),
  }));
}
