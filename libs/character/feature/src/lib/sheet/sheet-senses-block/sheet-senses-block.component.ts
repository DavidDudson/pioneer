import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Surface } from '@pioneer/frontier';
import { SenseIcons } from '@pioneer/rules/ui';

import { SheetState } from '../sheet-state';

/** The character's senses as icon rows in a card of the sheet's header row. */
@Component({
  selector: 'pio-sheet-senses-block',
  imports: [SenseIcons, Surface],
  templateUrl: './sheet-senses-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SheetSensesBlock {
  protected readonly sheet = inject(SheetState);
}
