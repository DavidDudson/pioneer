import {
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
} from '@tanstack/angular-table';
import type { ColumnDef, ColumnHelper, Header, RowData } from '@tanstack/angular-table';

import type { Size } from '../../tokens';

/** What a column says about itself beyond its cells. */
export interface FrontierColumnMeta {
  /** How wide the column is where rows are laid out without a table (`fr-picker`); `fr-table` sizes by content. */
  readonly width?: Size;
  /** Whether the table's *Columns* panel can hide it. Off unless set; `defaultHidden` implies it. */
  readonly hideable?: boolean;
  /** Hidden until the user shows it, when the table has no remembered choice. */
  readonly defaultHidden?: boolean;
}

/** The phantom value that gives `columnMeta` its type. */
const COLUMN_META: FrontierColumnMeta = {};

/** The features every frontier table has: client-side sorting and column visibility. */
export const TABLE_FEATURES = tableFeatures({
  columnMeta: COLUMN_META,
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});
export type TableFeatureSet = typeof TABLE_FEATURES;

export type TableColumn<TData extends RowData> = ColumnDef<TableFeatureSet, TData>;
export type TableHeader<TData extends RowData> = Header<TableFeatureSet, TData>;

/** Typed column builder for `fr-table`: `const col = tableColumns<Row>(); col.columns([col.accessor('name', …)])`. */
export function tableColumns<TData extends RowData>(): ColumnHelper<TableFeatureSet, TData> {
  return createColumnHelper<TableFeatureSet, TData>();
}
