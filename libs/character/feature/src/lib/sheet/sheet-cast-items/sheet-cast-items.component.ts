import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SheetRituals } from '../sheet-rituals/sheet-rituals.component';
import { SheetStaves } from '../sheet-staves/sheet-staves.component';
import { SheetWands } from '../sheet-wands/sheet-wands.component';

/** The spellcasting items beside a character's own spells: its rituals, staves and wands. */
@Component({
  selector: 'pio-sheet-cast-items',
  imports: [SheetRituals, SheetStaves, SheetWands],
  templateUrl: './sheet-cast-items.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetCastItems {}
