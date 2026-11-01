import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CharacterId, PartyVitals } from '@pioneer/campaign/domain';
import { CharacterAvatar, GiftBadge } from '@pioneer/frontier';
import { ConditionBadge } from '@pioneer/rules/ui';

import { CampaignTransferStore } from '../../data/campaign-transfer-store';

/**
 * A party member's avatar: its health arc, wounds and death track, the worst of its conditions in the top-left
 * corner, and a gift badge in the top-right corner while an offer, of items or of coins, is open
 * for that character. The badge rocks (still under reduced motion) and counts the offers when there are several.
 * It only tracks whether the offers are showing: the party row reads `offers` and `expanded` through a template
 * reference and lists each offer below the whole row, with the same accept, decline and withdraw buttons as the
 * offers panel, so only the recipient's owner can accept. Accepted, declined and withdrawn offers leave the list,
 * and the badge with them.
 */
@Component({
  selector: 'pio-campaign-party-avatar',
  imports: [CharacterAvatar, ConditionBadge, GiftBadge, TranslocoPipe],
  templateUrl: './campaign-party-avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignPartyAvatar {
  public readonly characterId = input.required<CharacterId>();
  /** The name already worded, an archived character's placeholder included. */
  public readonly name = input.required<string>();
  /** How the character stands, as the party API reports it. */
  public readonly vitals = input.required<PartyVitals>();

  readonly #transfers = inject(CampaignTransferStore);

  /** Offers waiting for this character's owner to answer, oldest first. */
  public readonly offers = computed(() =>
    (this.#transfers.pending.data() ?? []).filter((offer) => offer.to === this.characterId()),
  );

  /** The avatar's Hit Points; none while the character has no maximum. */
  protected readonly hp = computed(() => this.vitals().hp);

  /** The avatar's death-save darkening, one step per point of the dying value (not failed saves as such); undefined while not dying. */
  protected readonly failedSaves = computed(() => {
    const { dying } = this.vitals();
    return dying > 0 ? dying : undefined;
  });

  /** Whether the offers are showing. It closes whenever the offers run out, so a new offer starts closed. */
  public readonly expanded = linkedSignal<boolean, boolean>({
    source: () => this.offers().length === 0,
    computation: () => false,
  });

  protected toggle(): void {
    this.expanded.update((expanded) => !expanded);
  }
}
