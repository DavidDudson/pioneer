import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SheetRituals } from '../sheet-rituals/sheet-rituals.component';

/** The spellcasting items beside a character's own spells: its rituals. Wands, staves and scrolls are rows of the spell list. */
@Component({
  selector: 'pio-sheet-cast-items',
  imports: [SheetRituals],
  templateUrl: './sheet-cast-items.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetCastItems {}
