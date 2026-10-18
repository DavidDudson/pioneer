import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Stack } from '@pioneer/frontier';

import { SheetActiveList } from '../sheet-active-list/sheet-active-list.component';
import { SheetTurnBar } from '../sheet-turn-bar/sheet-turn-bar.component';

/** The turn bar with the active list beside it (#354, #357): where the turn is, and what is running on the character. */
@Component({
  selector: 'pio-sheet-turn-panel',
  imports: [SheetActiveList, SheetTurnBar, Stack],
  templateUrl: './sheet-turn-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetTurnPanel {}
