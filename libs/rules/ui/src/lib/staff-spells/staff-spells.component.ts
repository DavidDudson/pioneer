import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';
import { STAFF_CANTRIP } from '@pioneer/rules/sdk';

import { EntryHover } from '../entry-preview/entry-hover.component';
import type { StaffLine } from './staff-spells-line';
import { STAFF_SPELL_BLOCK_MESSAGES, StaffSpellsMessage } from './staff-spells-messages';

/**
 * The staves a character holds, each as its own section of the spell list (play-and-campaigns.md, "Staves and charged
 * items"): the staff's name, the charges it has left, and its spells by rank with the charges each costs. A spell the
 * holder can't cast is shown with the reason, not hidden.
 *
 * Read-only and presentational (ADR-0028): the caller works out the lines from the held staves.
 *
 * ```html
 * <pio-staff-spells [staves]="staves()" />
 * ```
 */
@Component({
  selector: 'pio-staff-spells',
  imports: [Badge, EntryHover, Heading, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './staff-spells.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffSpellsView {
  /** The held staves; none renders nothing. */
  public readonly staves = input<readonly StaffLine[]>([]);

  protected readonly Message = StaffSpellsMessage;
  protected readonly blocks = STAFF_SPELL_BLOCK_MESSAGES;
  protected readonly cantrip = STAFF_CANTRIP;
}
