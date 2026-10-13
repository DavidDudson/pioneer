import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Grid, InlineField, Select, Stack, Text } from '@pioneer/frontier';

import type { SlotPickField } from '../sheet-slot-picks';

/**
 * A grid of slot pickers on the sheet, one inline edit per slot, each offering what its slot offers: the trained skills
 * and skill increases up to the character's level, or the choices that list their options (#596). Nothing when there
 * are none.
 */
@Component({
  selector: 'pio-sheet-pick-fields',
  imports: [Grid, InlineField, Select, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-pick-fields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetPickFields {
  public readonly fields = input.required<readonly SlotPickField[]>();
}
