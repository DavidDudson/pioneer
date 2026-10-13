import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone } from '@pioneer/frontier';

import { SpellcastingMessage } from '../../spellcasting/spellcasting-messages';

/**
 * A spell rank as a badge: "1st rank", "2nd rank".
 *
 * ```html
 * <pio-rank-badge [rank]="spell.rank" />
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

  protected readonly Message = SpellcastingMessage;
  protected readonly tone = BadgeTone.Accent;
}
