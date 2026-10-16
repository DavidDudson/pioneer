import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Button, Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';

import { StaffSpellRow } from './staff-spell-row.component';
import type { StaffCastRequest, StaffLine } from './staff-spells-line';
import { StaffSpellsMessage } from './staff-spells-messages';

/**
 * The staves a character holds, each as its own section of the spell list (play-and-campaigns.md, "Staves and charged
 * items"): the staff's name, the charges it has left, and its spells by rank with the charges each costs. A spell the
 * holder can't cast is shown with the reason, not hidden. A spell that can be cast has a button for each way to pay
 * for it, labelled with what it spends, so the cost shows before the cast applies; the last cast can be taken back.
 *
 * Presentational (ADR-0028): the caller works out the lines from the held staves and makes the casts.
 *
 * ```html
 * <pio-staff-spells [staves]="staves()" (cast)="cast($event)" (undo)="undo($event)" />
 * ```
 */
@Component({
  selector: 'pio-staff-spells',
  imports: [Badge, Button, Heading, List, ListItem, Stack, StaffSpellRow, Text, TranslocoPipe],
  templateUrl: './staff-spells.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffSpellsView {
  /** The held staves; none renders nothing. */
  public readonly staves = input<readonly StaffLine[]>([]);
  /** Whether an edit is in flight, so no second one is started. */
  public readonly busy = input(false);
  /** Why the last edit failed, shown until the next one; undefined when none did. */
  public readonly error = input<string | undefined>(undefined);

  /** The spell to cast and how to pay for it. */
  public readonly cast = output<StaffCastRequest>();
  /** The key of the staff whose last cast the player takes back. */
  public readonly undo = output<string>();

  protected readonly Message = StaffSpellsMessage;
}
