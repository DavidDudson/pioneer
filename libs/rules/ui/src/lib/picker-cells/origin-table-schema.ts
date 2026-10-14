import type { RowData } from '@pioneer/frontier/data';
import type { AttributeBoost } from '@pioneer/rules/sdk';

import { AttributeBoosts } from './attribute-boosts/attribute-boosts.component';
import type { Chip } from './chip-list/chip-list.component';
import { RulesTableSchema } from './rules-table-schema';
import type { CellColumn } from './rules-table-schema';

/** Picker rows that are ancestries, heritages, backgrounds or classes: the origins that shape a character. */
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

  /** Short facts of an origin as chips: hit points, size, speed, flaws, languages, skills, Lores and feats. */
  public addFacts(options: CellColumn<TRow, readonly Chip[]>): this {
    return this.addChips(options);
  }
}
