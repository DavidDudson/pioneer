import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, ButtonVariant, Stack } from '@pioneer/frontier';

import type { StaffSpellLine } from './staff-spells-line';
import { StaffSpellsMessage } from './staff-spells-messages';

/**
 * The ways to cast one spell of a staff: a button for each way to pay for it, labelled with the charges and the slot it
 * spends, so the cost shows before the cast applies. Presentational: the section above it makes the cast.
 */
@Component({
  selector: 'pio-staff-cast-buttons',
  imports: [Button, Stack, TranslocoPipe],
  templateUrl: './staff-cast-buttons.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffCastButtons {
  public readonly spell = input.required<StaffSpellLine>();
  public readonly busy = input(false);

  /** The slot to pay the charge with, or undefined when the staff's charges alone pay. */
  public readonly cast = output<string | undefined>();

  protected readonly Message = StaffSpellsMessage;
  protected readonly primary = ButtonVariant.Primary;
}
