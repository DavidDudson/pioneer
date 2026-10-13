import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { PickedPreparation } from '@pioneer/character/domain';
import { Heading, InlineField, List, ListItem, Stack, Text } from '@pioneer/frontier';
import { Combobox } from '@pioneer/frontier/data';
import { SpellPreparation } from '@pioneer/rules/sdk';
import { SpellDetails, TRADITION_MESSAGES } from '@pioneer/rules/ui';

import type { PreparedEntryFields } from '../sheet-spell-picks';

/** Each kind of entry's heading: its prepared spells, or its spell repertoire. */
const HEADINGS: Readonly<Record<PickedPreparation, string>> = {
  [SpellPreparation.Prepared]: 'character.sheet.prepared.heading',
  [SpellPreparation.Spontaneous]: 'character.sheet.repertoire.heading',
};

/**
 * The spell pickers on the sheet (#478): for each prepared entry, its cantrips and slots rank by rank, then its pools'
 * (#581), each an inline pick searching the spells it takes; for each spontaneous entry, its repertoire the same way,
 * each rank's signature spell after its spells, the rank's note saying where the signature spell is cast (#479). A pick
 * the slot no longer takes says why, under it and in what its edit button reads out; a pool whose slots wait on a
 * choice (a divine font's font) says so, and so does a signature slot whose rank's repertoire is still empty. Nothing
 * for a character with no prepared or spontaneous entry.
 */
@Component({
  selector: 'pio-sheet-prepared-spells',
  imports: [Combobox, Heading, InlineField, List, ListItem, SpellDetails, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-prepared-spells.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetPreparedSpells {
  public readonly entries = input.required<readonly PreparedEntryFields[]>();

  protected readonly traditions = TRADITION_MESSAGES;
  protected readonly headings = HEADINGS;
}
