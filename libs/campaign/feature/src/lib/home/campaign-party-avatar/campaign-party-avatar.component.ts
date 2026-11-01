import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CharacterId } from '@pioneer/campaign/domain';
import { CharacterAvatar, GiftBadge } from '@pioneer/frontier';

import { CampaignTransferStore } from '../../data/campaign-transfer-store';

/**
 * A party member's avatar with a gift badge in its top-right corner while an offer, of items or of coins, is open
 * for that character. The badge rocks (still under reduced motion) and counts the offers when there are several.
 * It only tracks whether the offers are showing: the party row reads `offers` and `expanded` through a template
 * reference and lists each offer below the whole row, with the same accept, decline and withdraw buttons as the
 * offers panel, so only the recipient's owner can accept. Accepted, declined and withdrawn offers leave the list,
 * and the badge with them.
 */
@Component({
  selector: 'pio-campaign-party-avatar',
  imports: [CharacterAvatar, GiftBadge, TranslocoPipe],
  templateUrl: './campaign-party-avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignPartyAvatar {
  public readonly characterId = input.required<CharacterId>();
  /** The name already worded, an archived character's placeholder included. */
  public readonly name = input.required<string>();

  readonly #transfers = inject(CampaignTransferStore);

  /** Offers waiting for this character's owner to answer, oldest first. */
  public readonly offers = computed(() =>
    (this.#transfers.pending.data() ?? []).filter((offer) => offer.to === this.characterId()),
  );

  /** Whether the offers are showing. It closes whenever the offers run out, so a new offer starts closed. */
  public readonly expanded = linkedSignal<boolean, boolean>({
    source: () => this.offers().length === 0,
    computation: () => false,
  });

  protected toggle(): void {
    this.expanded.update((expanded) => !expanded);
  }
}
