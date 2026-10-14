import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone } from '@pioneer/frontier';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { SpellcastingMessage } from '../../spellcasting/spellcasting-messages';

/**
 * A spell rank as a badge: "1st rank", "2nd rank"; "Cantrip" for a cantrip. With `heightenedTo` it also says the rank
 * the spell is cast at when that is not its own: "1st rank, heightened to 3rd", "Cantrip, heightened to 4th".
 *
 * ```html
 * <pio-rank-badge [rank]="spell.rank" [cantrip]="spell.cantrip" [heightenedTo]="slot.castRank" />
 * ```
 */
@Component({
  selector: 'pio-rank-badge',
  imports: [Badge, TranslocoPipe],
  templateUrl: './rank-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankBadge {
  public readonly rank = input.required<number>();
  /** The spell is a cantrip: it reads "Cantrip" in place of its rank. */
  public readonly cantrip = input(false);
  /** The rank it is cast at, when a slot casts it above its own; undefined for no heightening. */
  public readonly heightenedTo = input<number | undefined>(undefined);

  protected readonly tone = BadgeTone.Accent;

  protected readonly label = computed((): MessageDescriptor => {
    const to = this.heightenedTo();
    const heightened = to !== undefined && (this.cantrip() || to > this.rank());
    if (this.cantrip()) {
      return heightened ? message(SpellcastingMessage.CantripHeightened, { to }) : message(SpellcastingMessage.Cantrip);
    }
    return heightened
      ? message(SpellcastingMessage.RankHeightened, { rank: this.rank(), to })
      : message(SpellcastingMessage.Rank, { rank: this.rank() });
  });
}
