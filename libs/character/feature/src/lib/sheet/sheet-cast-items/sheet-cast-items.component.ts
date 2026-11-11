import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SheetRituals } from '../sheet-rituals/sheet-rituals.component';
import { SheetUnplacedPicks } from '../sheet-unplaced-picks/sheet-unplaced-picks.component';

/** The spellcasting items beside a character's own spells: the imported spells no slot took, and its rituals. Wands, staves and scrolls are rows of the spell list. */
@Component({
  selector: 'pio-sheet-cast-items',
  imports: [SheetRituals, SheetUnplacedPicks],
  templateUrl: './sheet-cast-items.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetCastItems {}
