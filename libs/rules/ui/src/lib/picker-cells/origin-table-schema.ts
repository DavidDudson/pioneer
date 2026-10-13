import type { RowData } from '@pioneer/frontier/data';
import type { AttributeBoost } from '@pioneer/rules/sdk';

import { AttributeBoosts } from './attribute-boosts/attribute-boosts.component';
import { RulesTableSchema } from './rules-table-schema';
import type { CellColumn } from './rules-table-schema';

/** Picker rows that are ancestries, backgrounds or classes: kinds that boost attributes. */
export class OriginTableSchema<TRow extends RowData> extends RulesTableSchema<TRow> {
  /** The attribute boosts a row gives, sorted by how many. */
  public addBoosts(options: CellColumn<TRow, readonly AttributeBoost[]>): this {
    return this.addComponent({
      ...options,
      sortValue: (row) => options.value(row).length,
      component: AttributeBoosts,
      inputs: (row) => ({ boosts: options.value(row) }),
    });
  }
}
