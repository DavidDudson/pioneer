import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Stack, Text } from '@pioneer/frontier';
import { RollCard } from '@pioneer/play/ui';

import { SheetConsumableUse } from '../sheet-consumable-use';

/** The roll of the last consumable used, on the same roll card the Consumables section shows it on (#1832). */
@Component({
  selector: 'pio-sheet-consumable-roll',
  imports: [RollCard, Stack, Text],
  templateUrl: './sheet-consumable-roll.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetConsumableRoll {
  protected readonly rolled = inject(SheetConsumableUse).rolled;
}
