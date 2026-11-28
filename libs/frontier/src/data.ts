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

export { TableDensity, TableViewStore } from './lib/data/table-view/table-view-store';

export type { StoredDensity, StoredTableView } from './lib/data/table-view/table-view-store';

export { TableViewKey } from './lib/data/table-view/table-view-keys';

export { tableViewColumns } from './lib/data/table-view/table-view-schema';

export type {
  TableView,
  TableViewColumn,
  TableViewParams,
  TableViewQuery,
  TableViewSchema,
  TableViewSort,
} from './lib/data/table-view/table-view.types';

export { PropertyCell } from './lib/data/property/property-cell.component';

export {
  ENTITY_CELL,
  findPropertyKind,
  injectPropertyContext,
  PROPERTY_KINDS,
  type PropertyKindMap,
  providePropertyKinds,
} from './lib/data/property/property-kind-registry';

export { FRONTIER_PROPERTY_KINDS } from './lib/data/property/property-kinds';

export {
  PropertyAlign,
  type PropertyCellInputs,
  type PropertyContext,
  type PropertyDescriptor,
  type PropertyKind,
  PropertyKindId,
} from './lib/data/property/property.types';

export { resolvePropertyCell } from './lib/data/property/resolve-property-cell';

export { VirtualItem } from './lib/data/virtual-list/virtual-item.directive';

export { VirtualEstimate, VirtualList } from './lib/data/virtual-list/virtual-list.component';

export { Combobox, type ComboboxOption, type ComboboxTag } from './lib/controls/combobox/combobox.component';

export { Picker, type PickerSort } from './lib/controls/picker/picker.component';

export { PickerField } from './lib/forms/picker-field/picker-field.component';

/**
 * A header or cell that renders a component instead of a plain value, for content richer than text:
 * `cell: ({ row }) => tableComponent(RuleText, { inputs: { text: row.original.text } })`.
 */
export { flexRenderComponent as tableComponent } from '@tanstack/angular-table';
