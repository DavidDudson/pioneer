import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Text } from '@pioneer/frontier';
import { STAFF_CANTRIP } from '@pioneer/rules/sdk';

import { StaffCastButtons } from '../staff-spells/staff-cast-buttons.component';
import type { StaffSpellLine } from '../staff-spells/staff-spells-line';
import { STAFF_SPELL_BLOCK_MESSAGES, StaffSpellsMessage } from '../staff-spells/staff-spells-messages';
import type { SpellItemEvent } from './spell-item';

/** What a staff's spell costs, why it can't be cast when it can't, and the ways to pay for casting it. */
@Component({
  selector: 'pio-staff-row-controls',
  imports: [StaffCastButtons, Text, TranslocoPipe],
  templateUrl: './staff-row-controls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffRowControls {
  /** The staff's key: the inventory item's id. */
  public readonly staff = input.required<string>();
  /** Whether it is the staff prepared for the day. */
  public readonly prepared = input.required<boolean>();
  public readonly spell = input.required<StaffSpellLine>();
  public readonly busy = input(false);

  public readonly act = output<SpellItemEvent>();

  protected readonly Message = StaffSpellsMessage;
  protected readonly blocks = STAFF_SPELL_BLOCK_MESSAGES;
  protected readonly cantrip = STAFF_CANTRIP;
}
