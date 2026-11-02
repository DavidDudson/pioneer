import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CharacterId, PartyVitals } from '@pioneer/campaign/domain';
import { CharacterAvatar, GiftBadge, HoverCard, HoverCardContent } from '@pioneer/frontier';
import { ConditionBadge, ConditionList } from '@pioneer/rules/ui';
import type { ConditionLine } from '@pioneer/rules/ui';

import { CampaignTransferStore } from '../../data/campaign-transfer-store';

/**
 * A party member's avatar: its health arc, wounds and death track, the worst of its conditions in the top-left
 * corner, and a gift badge in the top-right corner while an offer, of items or of coins, is open
 * for that character. The badge rocks (still under reduced motion) and counts the offers when there are several.
 * It only tracks whether the offers are showing: the party row reads `offers` and `expanded` through a template
 * reference and lists each offer below the whole row, with the same accept, decline and withdraw buttons as the
 * offers panel, so only the recipient's owner can accept. Accepted, declined and withdrawn offers leave the list,
 * and the badge with them. Hovering or focusing the avatar opens a popover that lists its conditions with their
 * values, most serious first, and says whether it is bloodied.
 */
@Component({
  selector: 'pio-campaign-party-avatar',
  imports: [CharacterAvatar, ConditionBadge, ConditionList, GiftBadge, HoverCard, HoverCardContent, TranslocoPipe],
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

  /** The names of its conditions, for the badge. */
  protected readonly slugs = computed(() => this.vitals().conditions.map(({ name }) => name));

  /** Its conditions with their values, for the popover. */
  protected readonly lines = computed((): readonly ConditionLine[] =>
    this.vitals().conditions.map(({ name, value }): ConditionLine => ({ slug: name, value })),
  );

  /** Whether it is at or below half its Hit Points. */
  protected readonly bloodied = computed((): boolean => {
    const points = this.hp();
    return points !== undefined && points.max > 0 && points.current * 2 <= points.max;
  });

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
