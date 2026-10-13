import type { RowData } from '@pioneer/frontier/data';

import type { Chip } from './chip-list/chip-list.component';
import { RankBadge } from './rank-badge/rank-badge.component';
import { RulesTableSchema } from './rules-table-schema';
import type { CellColumn } from './rules-table-schema';

/** Picker rows that are spells. */
export class SpellTableSchema<TRow extends RowData> extends RulesTableSchema<TRow> {
  /** A spell rank badge: "3rd rank". */
  public addRank(options: CellColumn<TRow, number>): this {
    return this.addComponent({
      ...options,
      sortValue: options.value,
      component: RankBadge,
      inputs: (row) => ({ rank: options.value(row) }),
    });
  }

  /** The traditions a spell is on, as chips. */
  public addTraditions(options: CellColumn<TRow, readonly Chip[]>): this {
    return this.addChips(options);
  }
}
