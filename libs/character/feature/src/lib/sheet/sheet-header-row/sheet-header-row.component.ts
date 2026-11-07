import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Grid } from '@pioneer/frontier';
import { VitalsView } from '@pioneer/rules/ui';

import { SheetArmorClass } from '../sheet-armor-class/sheet-armor-class.component';
import { SheetAttributesBlock } from '../sheet-attributes-block/sheet-attributes-block.component';
import { SheetCharacterBlock } from '../sheet-character-block/sheet-character-block.component';
import { SheetSensesBlock } from '../sheet-senses-block/sheet-senses-block.component';
import { SheetSpeedBlock } from '../sheet-speed-block/sheet-speed-block.component';
import { SheetState } from '../sheet-state';

/** The blocks of the sheet header, one card each: character, armor class, attributes, vitals, speed and senses. */
@Component({
  selector: 'pio-sheet-header-row',
  imports: [
    Grid,
    SheetArmorClass,
    SheetAttributesBlock,
    SheetCharacterBlock,
    SheetSensesBlock,
    SheetSpeedBlock,
    VitalsView,
  ],
  templateUrl: './sheet-header-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class SheetHeaderRow {
  protected readonly sheet = inject(SheetState);
}
