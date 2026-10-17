import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BadgeTone, Stack, Tag, Text } from '@pioneer/frontier';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { InventoryMessage } from '../inventory-messages';

/**
 * Why an item breaks the table's rules: a warning tag, then one reason per rule it breaks, and for the reasons the
 * campaign's GM approved, a tag saying so. Nothing for an item that breaks none.
 */
@Component({
  selector: 'pio-inventory-breaks',
  imports: [Stack, Tag, Text, TranslocoPipe],
  templateUrl: './inventory-breaks.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryBreaks {
  public readonly reasons = input.required<readonly MessageDescriptor[]>();
  /** The reasons the campaign's GM approved, which no longer warn. */
  public readonly approved = input<readonly MessageDescriptor[]>([]);

  protected readonly Message = InventoryMessage;
  protected readonly Tone = BadgeTone;
}
