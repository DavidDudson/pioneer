import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Grid, Heading, InlineField, Stack, Text } from '@pioneer/frontier';
import { Combobox } from '@pioneer/frontier/data';
import { TRADITION_MESSAGES } from '@pioneer/rules/ui';

import type { PreparedEntryFields } from '../sheet-spell-picks';

/**
 * The prepared spell pickers on the sheet (#478): for each prepared entry, its cantrips and slots rank by rank, then its
 * pools' (#581), each an inline pick searching the spells it takes. A pick the slot no longer takes says why, under it
 * and in what its edit button reads out; a pool whose slots wait on a choice (a divine font's font) says so. Nothing for
 * a character that prepares no spells.
 */
@Component({
  selector: 'pio-sheet-prepared-spells',
  imports: [Combobox, Grid, Heading, InlineField, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-prepared-spells.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetPreparedSpells {
  public readonly entries = input.required<readonly PreparedEntryFields[]>();

  protected readonly traditions = TRADITION_MESSAGES;
}
