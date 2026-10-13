import type { RowData } from '@pioneer/frontier/data';
import { bulkInTenths, priceInCopper } from '@pioneer/rules/sdk';
import type { Bulk, Price } from '@pioneer/rules/sdk';

import { BulkCell } from './bulk-cell/bulk-cell.component';
import { PriceCell } from './price-cell/price-cell.component';
import { NOTHING, RulesTableSchema } from './rules-table-schema';
import type { CellColumn } from './rules-table-schema';

/** Picker rows that are items. */
export class ItemTableSchema<TRow extends RowData> extends RulesTableSchema<TRow> {
  /** A price in coins, sorted by its value in copper; an item with no price sorts first. */
  public addPrice(options: CellColumn<TRow, Price | undefined>): this {
    return this.addComponent({
      ...options,
      sortValue: (row) => {
        const price = options.value(row);
        return price === undefined ? NOTHING : priceInCopper(price);
      },
      component: PriceCell,
      inputs: (row) => ({ price: options.value(row) }),
    });
  }

  /** Bulk as the rules print it, sorted by tenths of Bulk. */
  public addBulk(options: CellColumn<TRow, Bulk | undefined>): this {
    return this.addComponent({
      ...options,
      sortValue: (row) => {
        const bulk = options.value(row);
        return bulk === undefined ? NOTHING : bulkInTenths(bulk);
      },
      component: BulkCell,
      inputs: (row) => ({ bulk: options.value(row) }),
    });
  }
}
