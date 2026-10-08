import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FlexRender, injectTable } from '@tanstack/angular-table';
import type { RowData } from '@tanstack/angular-table';
import { cva } from 'class-variance-authority';

import { TableHeaderCell } from './header-cell/header-cell.component';
import { TABLE_FEATURES } from './table-features';
import type { TableColumn, TableFeatureSet, TableHeader } from './table-features';

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

function ariaSort<TData extends RowData>(header: TableHeader<TData>): string | undefined {
  const sorted = header.column.getIsSorted();
  return sorted === false ? undefined : ARIA_SORT[sorted];
}

const scrollerClasses = cva('block w-full overflow-x-auto')();
const tableClasses = cva('w-full border-collapse text-body tabular-nums')();
const captionVariants = cva('pb-xs text-start text-label font-medium text-fg-muted', {
  variants: { hidden: { true: 'sr-only', false: '' } },
});
const headerCellClasses = cva(
  'border-b border-line-default px-sm py-xs text-start text-label font-medium text-fg-muted',
)();
const cellClasses = cva('border-b border-line-subtle px-sm py-xs text-fg-default')();

/**
 * A data table on TanStack Table: semantic `<table>`, token styling and
 * click-to-sort headers. Columns come from `tableColumns<Row>()`; keep them
 * and `data` stable (a `computed`, not an inline array). Narrow containers
 * scroll the table sideways inside itself, never the page.
 */
@Component({
  selector: 'fr-table',
  imports: [FlexRender, TableHeaderCell],
  templateUrl: './table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Table<TData extends RowData> {
  public readonly data = input.required<readonly TData[]>();
  public readonly columns = input.required<readonly TableColumn<TData>[]>();
  /** Accessible name; shown above the table unless `hideCaption`. */
  public readonly caption = input.required<string>();
  public readonly hideCaption = input(false, { transform: booleanAttribute });
  public readonly rowId = input<((row: TData) => string) | undefined>(undefined);

  protected readonly table = injectTable<TableFeatureSet, TData>(() => {
    const rowId = this.rowId();
    return {
      features: TABLE_FEATURES,
      columns: [...this.columns()],
      data: [...this.data()],
      ...(rowId === undefined ? {} : { getRowId: rowId }),
    };
  });

  protected readonly scrollerClasses = scrollerClasses;
  protected readonly tableClasses = tableClasses;
  protected readonly headerCellClasses = headerCellClasses;
  protected readonly cellClasses = cellClasses;
  protected readonly captionClasses = computed(() => captionVariants({ hidden: this.hideCaption() }));
  protected readonly ariaSort = ariaSort<TData>;
}
