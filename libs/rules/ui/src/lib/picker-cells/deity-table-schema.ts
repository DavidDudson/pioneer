import type { RowData } from '@pioneer/frontier/data';

import type { Chip } from './chip-list/chip-list.component';
import { RulesTableSchema } from './rules-table-schema';
import type { CellColumn } from './rules-table-schema';

/** Picker rows that are deities. */
export class DeityTableSchema<TRow extends RowData> extends RulesTableSchema<TRow> {
  /** Short facts of a deity as chips: sanctification, divine font, domains, favoured weapons and divine skills. */
  public addFacts(options: CellColumn<TRow, readonly Chip[]>): this {
    return this.addChips(options);
  }
}
