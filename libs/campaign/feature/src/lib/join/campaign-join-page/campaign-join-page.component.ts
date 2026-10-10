import { afterNextRender, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { InviteToken } from '@pioneer/campaign/domain';
import { injectAsyncAction, Link, Message, Page, Spinner, Stack, Surface, Text } from '@pioneer/frontier';
import { ApiError } from '@pioneer/shared/web';

import { CampaignStore } from '../../data/campaign-store';
import { PendingInvite } from '../../data/pending-invite';

/**
 * Where an invite link (`/campaigns/join#<token>`) lands. The token is in the fragment, which
 * browsers never send to a server. The page moves it to session storage and out of the address
 * bar before joining, so a 401 sends the visitor to sign in with a return path that holds no token,
 * and the stored token is picked up when they come back. On success it goes to the campaign,
 * replacing this page in history so Back doesn't join again.
 */
@Component({
  selector: 'pio-campaign-join-page',
  imports: [Link, Message, Page, Spinner, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './campaign-join-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignJoinPage {
  readonly #store = inject(CampaignStore);
  readonly #pending = inject(PendingInvite);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #i18n = inject(TranslocoService);

  /** The link's token, or the one kept from before sign-in; undefined when neither holds one. */
  protected readonly parsed: InviteToken | undefined;
  /** Whether the token came in this page's URL, and so must be taken out of it. */
  readonly #inUrl: boolean;

  protected readonly joining = injectAsyncAction(
    () =>
      async (invite: InviteToken | undefined): Promise<void> => {
        // First out of the URL, so a 401 below prompts sign-in with a return path that holds no token.
        if (this.#inUrl) {
          await this.#router.navigate([], { relativeTo: this.#route, replaceUrl: true });
        }
        if (invite === undefined) {
          this.#pending.clear();
          return;
        }
        try {
          const campaign = await this.#store.join(invite);
          this.#pending.clear();
          await this.#router.navigate(['/campaigns', campaign.id], { replaceUrl: true });
        } catch (error: unknown) {
          // Signed out: keep the token for when sign-in brings the visitor back here.
          if (!ApiError.isUnauthorized(error)) {
            this.#pending.clear();
          }
          throw error;
        }
      },
    {
      describeError: (error): string => {
        const descriptor = ApiError.describe(error);
        return this.#i18n.translate(descriptor.key, descriptor.params);
      },
    },
  );

  public constructor() {
    const fragment = this.#route.snapshot.fragment ?? undefined;
    if (fragment !== undefined) {
      this.#pending.keep(fragment);
    }
    this.parsed = InviteToken.safeParse(fragment ?? this.#pending.read()).data;
    this.#inUrl = fragment !== undefined;
    afterNextRender(() => {
      this.joining.run(this.parsed);
    });
  }
}
