import type { RowData } from '@pioneer/frontier/data';

import type { Chip } from './chip-list/chip-list.component';
import { RankBadge } from './rank-badge/rank-badge.component';
import { RulesTableSchema } from './rules-table-schema';
import type { CellColumn } from './rules-table-schema';

/** A spell rank column; a cantrip and the rank a slot casts a spell at show in the badge. */
export interface RankColumn<TRow> extends CellColumn<TRow, number> {
  /** Whether the row's spell is a cantrip: it reads "Cantrip" and sorts before rank 1. */
  readonly cantrip?: (row: TRow) => boolean;
  /** The rank a slot casts the spell at, when above its own. */
  readonly heightenedTo?: (row: TRow) => number | undefined;
}

/** Picker rows that are spells. */
export class SpellTableSchema<TRow extends RowData> extends RulesTableSchema<TRow> {
  /** A spell rank badge: "3rd rank", "Cantrip", "1st rank, heightened to 3rd". Cantrips sort first. */
  public addRank(options: RankColumn<TRow>): this {
    const { cantrip, heightenedTo, ...column } = options;
    return this.addComponent({
      ...column,
      sortValue: (row) => (cantrip?.(row) === true ? 0 : options.value(row)),
      component: RankBadge,
      inputs: (row) => ({
        rank: options.value(row),
        cantrip: cantrip?.(row) ?? false,
        heightenedTo: heightenedTo?.(row),
      }),
    });
  }

  /** The traditions a spell is on, as chips. */
  public addTraditions(options: CellColumn<TRow, readonly Chip[]>): this {
    return this.addChips(options);
  }

  /** Short facts of a spell as chips: where it reaches, what it hits, how long it lasts, what it is rolled against. */
  public addFacts(options: CellColumn<TRow, readonly Chip[]>): this {
    return this.addChips(options);
  }
}
