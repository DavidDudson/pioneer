/**
 * `@pioneer/frontier/data`: data display on TanStack Table, Charts and
 * Virtual, and the combobox, whose long option lists are virtualised. A
 * separate entry point so only the lazy routes that use them pay for those
 * libraries; the main entry stays small enough for the app shell.
 */
export { Chart, ChartAspect } from './lib/data/chart/chart.component';
export { Table } from './lib/data/table/table.component';
export { type TableColumn, tableColumns } from './lib/data/table/table-features';
export type { RowData } from '@tanstack/angular-table';
export {
  type ColumnOptions,
  type ComponentColumn,
  type DateColumn,
  type SortValue,
  TableSchema,
  type TagCell,
  type TagColumn,
  tableSchema,
  type TextColumn,
} from './lib/data/table/table-schema';
export { decodeTableView, encodeTableView, TYPICAL_VIEW_LENGTH } from './lib/data/table-view/table-view';
export {
  type ApplyOptions,
  injectTableView,
  type FacetTextCodec,
  type TableViewOptions,
  type TableViewState,
} from './lib/data/table-view/table-view-state';
export { tableViewColumns } from './lib/data/table-view/table-view-schema';
export type {
  TableView,
  TableViewColumn,
  TableViewParams,
  TableViewQuery,
  TableViewSchema,
  TableViewSort,
} from './lib/data/table-view/table-view.types';
export { VirtualItem } from './lib/data/virtual-list/virtual-item.directive';
export { VirtualEstimate, VirtualList } from './lib/data/virtual-list/virtual-list.component';
export { Combobox, type ComboboxOption } from './lib/controls/combobox/combobox.component';
export { ComboboxField } from './lib/forms/combobox-field/combobox-field.component';
export { Picker, type PickerSort } from './lib/controls/picker/picker.component';
export { PickerField } from './lib/forms/picker-field/picker-field.component';
/**
 * A header or cell that renders a component instead of a plain value, for content richer than text:
 * `cell: ({ row }) => tableComponent(RuleText, { inputs: { text: row.original.text } })`.
 */
export { flexRenderComponent as tableComponent } from '@tanstack/angular-table';
