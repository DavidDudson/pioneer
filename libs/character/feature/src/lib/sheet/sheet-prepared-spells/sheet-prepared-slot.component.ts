import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { InlineField, Stack, Text } from '@pioneer/frontier';
import { SpellDetails, SpellPicker } from '@pioneer/rules/ui';

import type { PreparedField } from '../sheet-spell-picks';

/**
 * One prepared or repertoire slot: an inline pick searching the spells it takes, with what its spell does under it,
 * and the server's reason when its pick counts for nothing. A slot a bloodline or mystery fills (ADR-0062) is its
 * spell as read-only text, since it takes no pick.
 */
@Component({
  selector: 'pio-sheet-prepared-slot',
  imports: [InlineField, SpellDetails, SpellPicker, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-prepared-slot.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetPreparedSlot {
  public readonly slot = input.required<PreparedField>();
}
