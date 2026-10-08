import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
} from '@tanstack/angular-table';
import type { ColumnDef, ColumnHelper, Header, RowData } from '@tanstack/angular-table';

/** The features every frontier table has: client-side sorting. */
export const TABLE_FEATURES = tableFeatures({
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
