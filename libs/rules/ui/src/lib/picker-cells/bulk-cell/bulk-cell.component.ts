import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocaleFormat, Text } from '@pioneer/frontier';
import type { Bulk } from '@pioneer/rules/sdk';

import { BULK_WEIGHT_MESSAGES, InventoryMessage } from '../../inventory/inventory-messages';
import { PickerCellMessage } from '../picker-cell-messages';

interface ShownBulk {
  readonly key: string;
  readonly params: Readonly<Record<string, string>>;
}

/**
 * An item's Bulk as the rules print it: a number, "L" for light, "—" for negligible. No Bulk shows a dash.
 *
 * ```html
 * <pio-bulk-cell [bulk]="item.bulk" />
 * ```
 */
@Component({
  selector: 'pio-bulk-cell',
  imports: [Text, TranslocoPipe],
  templateUrl: './bulk-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkCell {
  /** Undefined for a kit, whose Bulk is its contents'. */
  public readonly bulk = input.required<Bulk | undefined>();

  readonly #format = inject(LocaleFormat);

  protected readonly shown = computed((): ShownBulk => {
    const bulk = this.bulk();
    if (bulk === undefined) {
      return { key: PickerCellMessage.None, params: {} };
    }
    return typeof bulk === 'number'
      ? { key: InventoryMessage.BulkCount, params: { count: this.#format.number(bulk) } }
      : { key: BULK_WEIGHT_MESSAGES[bulk], params: {} };
  });
}
