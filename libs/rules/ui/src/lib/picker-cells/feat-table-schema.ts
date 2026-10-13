import type { RowData } from '@pioneer/frontier/data';

import { PrerequisiteList, PrerequisiteState } from './prerequisite-list/prerequisite-list.component';
import type { PrerequisiteLine } from './prerequisite-list/prerequisite-list.component';
import { RulesTableSchema } from './rules-table-schema';
import type { CellColumn } from './rules-table-schema';

/** Picker rows that are feats. */
export class FeatTableSchema<TRow extends RowData> extends RulesTableSchema<TRow> {
  /** Prerequisites with met and unmet state, sorted by how many are unmet. */
  public addPrerequisites(options: CellColumn<TRow, readonly PrerequisiteLine[]>): this {
    return this.addComponent({
      ...options,
      sortValue: (row) => options.value(row).filter(({ state }) => state === PrerequisiteState.Unmet).length,
      component: PrerequisiteList,
      inputs: (row) => ({ prerequisites: options.value(row) }),
    });
  }
}
