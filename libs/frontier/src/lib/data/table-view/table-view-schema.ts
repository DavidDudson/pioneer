import type { RowData } from '@tanstack/angular-table';

import type { TableColumn } from '../table/table-features';
import type { TableViewColumn } from './table-view.types';

/** The columns of a table schema that declare a `code`, which are the ones a shared view can name. */
export function tableViewColumns<TRow extends RowData>(
  columns: ReadonlyArray<TableColumn<TRow>>,
): ReadonlyArray<TableViewColumn> {
  return columns.flatMap((column): Array<TableViewColumn> => {
    const { id, meta } = column;

    if (id === undefined || meta?.code === undefined) {
      return [];
    }

    const entry: TableViewColumn = { id, code: meta.code };

    return [meta.defaultHidden === true ? { ...entry, defaultHidden: true } : entry];
  });
}
