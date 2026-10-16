import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Stack, Text } from '@pioneer/frontier';
import { STAFF_CANTRIP } from '@pioneer/rules/sdk';

import { EntryHover } from '../entry-preview/entry-hover.component';
import { StaffCastButtons } from './staff-cast-buttons.component';
import type { StaffSpellLine } from './staff-spells-line';
import { STAFF_SPELL_BLOCK_MESSAGES, StaffSpellsMessage } from './staff-spells-messages';

/**
 * One spell of a staff: its name, what casting it costs, why the holder can't cast it when they can't, and the ways to
 * cast it. Presentational: the section above it makes the cast.
 */
@Component({
  selector: 'pio-staff-spell-row',
  imports: [Badge, EntryHover, Stack, StaffCastButtons, Text, TranslocoPipe],
  templateUrl: './staff-spell-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffSpellRow {
  public readonly spell = input.required<StaffSpellLine>();
  public readonly busy = input(false);

  /** The slot to pay the charge with, or undefined when the staff's charges alone pay. */
  public readonly cast = output<string | undefined>();

  protected readonly Message = StaffSpellsMessage;
  protected readonly blocks = STAFF_SPELL_BLOCK_MESSAGES;
  protected readonly cantrip = STAFF_CANTRIP;
}
