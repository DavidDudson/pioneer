import type { RowData } from '@tanstack/angular-table';

import type { TableColumn } from '../table/table-features';
import type { TableViewColumn } from './table-view.types';

/** The columns of a table schema that declare a `code`, which are the ones a shared view can name. */
export function tableViewColumns<TRow extends RowData>(
  columns: readonly TableColumn<TRow>[],
): readonly TableViewColumn[] {
  return columns.flatMap((column): TableViewColumn[] => {
    const { id, meta } = column;
    if (id === undefined || meta?.code === undefined) {
      return [];
    }
    return [{ id, code: meta.code, ...(meta.defaultHidden === true ? { defaultHidden: true } : {}) }];
  });
}
