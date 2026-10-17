import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Link, Text } from '@pioneer/frontier';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

/** One note under a line's name, linking to where it says more when it can. */
export interface LineNote {
  readonly message: MessageDescriptor;
  readonly link?: readonly string[] | undefined;
}

/** One note about an item: how it is carried, or that it is a key item, which names the campaign's inventory. */
@Component({
  selector: 'pio-inventory-note',
  imports: [Link, Text, TranslocoPipe],
  templateUrl: './inventory-note.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryNote {
  public readonly note = input.required<LineNote>();
}
