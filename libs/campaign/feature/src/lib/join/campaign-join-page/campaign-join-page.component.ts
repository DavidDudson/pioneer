import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { InviteToken } from '@pioneer/campaign/domain';
import { injectAsyncAction, Link, Message, Page, Skeleton, Stack, Surface, Text } from '@pioneer/frontier';
import { ApiError } from '@pioneer/shared/web';

import { CampaignStore } from '../../data/campaign-store';

/**
 * Where an invite link lands. Joins as soon as it opens (the route already made the visitor sign
 * in), then goes to the campaign, replacing this page in history so Back doesn't join again.
 */
@Component({
  selector: 'pio-campaign-join-page',
  imports: [Link, Message, Page, Skeleton, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './campaign-join-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignJoinPage {
  /** Route param, bound by `withComponentInputBinding`. */
  public readonly token = input.required<string>();

  readonly #store = inject(CampaignStore);
  readonly #router = inject(Router);
  readonly #i18n = inject(TranslocoService);

  /** The link's token, or undefined when the link can't hold one: said like a token nobody knows. */
  protected readonly parsed = computed(() => InviteToken.safeParse(this.token()).data);

  protected readonly joining = injectAsyncAction(
    () =>
      async (token: InviteToken): Promise<void> => {
        const campaign = await this.#store.join(token);
        await this.#router.navigate(['/campaigns', campaign.id], { replaceUrl: true });
      },
    {
      describeError: (error): string => {
        const descriptor = ApiError.describe(error);
        return this.#i18n.translate(descriptor.key, descriptor.params);
      },
    },
  );

  public constructor() {
    // Only the token is tracked: running reads the action's status, which would rerun a failed join.
    effect(() => {
      const invite = this.parsed();
      if (invite !== undefined) {
        untracked(() => {
          this.joining.run(invite);
        });
      }
    });
  }
}
