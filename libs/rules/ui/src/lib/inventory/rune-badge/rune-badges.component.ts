import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Stack } from '@pioneer/frontier';

import type { RuneBadgeData } from './rune-badge-data';
import { RuneBadge } from './rune-badge.component';

/**
 * An item's runes as a wrapping row of gems under its name; nothing when it has none.
 *
 * ```html
 * <pio-rune-badges [runes]="badges" />
 * ```
 */
@Component({
  selector: 'pio-rune-badges',
  imports: [RuneBadge, Stack],
  templateUrl: './rune-badges.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuneBadges {
  public readonly runes = input<readonly RuneBadgeData[]>([]);
}
