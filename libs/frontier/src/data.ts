/**
 * `@pioneer/frontier/data`: data display on TanStack Table, Charts and
 * Virtual, and the combobox, whose long option lists are virtualised. A
 * separate entry point so only the lazy routes that use them pay for those
 * libraries; the main entry stays small enough for the app shell.
 */
export { Chart, ChartAspect } from './lib/data/chart/chart.component';
export { Table } from './lib/data/table/table.component';
export { type TableColumn, tableColumns } from './lib/data/table/table-features';
export { VirtualItem } from './lib/data/virtual-list/virtual-item.directive';
export { VirtualEstimate, VirtualList } from './lib/data/virtual-list/virtual-list.component';
export { Combobox } from './lib/controls/combobox/combobox.component';
export { ComboboxField } from './lib/forms/combobox-field/combobox-field.component';
