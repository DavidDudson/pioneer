import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncData, AsyncPending, AsyncRegion, Skeleton, Stack, Surface } from '@pioneer/frontier';
import { ArmorClass, DefenceIcons } from '@pioneer/rules/ui';

import { SheetState } from '../sheet-state';

/**
 * The Armor Class block at the top of the sheet: the number large, its breakdown on hover, and under it an icon for
 * each of resistances, immunities and weaknesses the character has, each opening its lines on hover.
 */
@Component({
  selector: 'pio-sheet-armor-class',
  imports: [ArmorClass, AsyncData, AsyncPending, AsyncRegion, DefenceIcons, Skeleton, Stack, Surface],
  templateUrl: './sheet-armor-class.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetArmorClass {
  protected readonly sheet = inject(SheetState);
  protected readonly picks = this.sheet.picks;
}
