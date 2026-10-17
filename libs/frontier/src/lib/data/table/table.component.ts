import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { FlexRender, injectTable } from '@tanstack/angular-table';
import type { RowData } from '@tanstack/angular-table';
import { cva } from 'class-variance-authority';

import type { TableViewSort } from '../table-view/table-view.types';
import { ColumnChooser } from './column-chooser/column-chooser.component';
import type { ColumnChoice, ColumnToggle } from './column-chooser/column-chooser.component';
import { TableHeaderCell } from './header-cell/header-cell.component';
import { TABLE_FEATURES } from './table-features';
import type { TableColumn, TableFeatureSet, TableHeader } from './table-features';
import { sortAfter, toSortingState } from './table-sort';

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

/** What the *Columns* control needs to know of a column. */
interface KnownColumn {
  readonly id: string;
  readonly label: string;
  readonly hideable: boolean;
  readonly defaultHidden: boolean;
}

/** A column's id, or nothing for a column with none (a group, or a display column given no id). */
function describe<TData extends RowData>(column: TableColumn<TData>): KnownColumn[] {
  const id = column.id ?? ('accessorKey' in column ? String(column.accessorKey) : undefined);
  if (id === undefined) {
    return [];
  }
  return [
    {
      id,
      label: typeof column.header === 'string' ? column.header : id,
      hideable: column.meta?.hideable === true || column.meta?.defaultHidden === true,
      defaultHidden: column.meta?.defaultHidden === true,
    },
  ];
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id) => right.includes(id));
}

/**
 * A data table on TanStack Table: semantic `<table>`, token styling and
 * click-to-sort headers. Columns come from `tableColumns<Row>()`; keep them
 * and `data` stable (a `computed`, not an inline array). Narrow containers
 * scroll the table sideways inside itself, never the page.
 *
 * Columns the schema marks `hideable` (or `defaultHidden`) can be shown and hidden from a *Columns* panel above
 * the table. `[(columnVisibility)]` is the ids of the hidden columns; it stays `undefined` until the user changes
 * it, which means each column's `defaultHidden`. At least one column always stays visible. `[(sorting)]` is the sorted
 * columns, so a page can keep them in its URL (see `injectTableView`).
 */
@Component({
  selector: 'fr-table',
  imports: [ColumnChooser, FlexRender, TableHeaderCell],
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
  /** Ids of the hidden columns; `undefined` is each column's `defaultHidden`. */
  public readonly columnVisibility = model<readonly string[] | undefined>(undefined);
  /** The sorted columns, first wins; pressing a header changes it. Empty is the order of `data`. */
  public readonly sorting = model<readonly TableViewSort[]>([]);

  /** Every column, with what the *Columns* control needs of it. Read from the definitions, before the table exists. */
  private readonly known = computed(() => this.columns().flatMap((column) => describe(column)));
  private readonly defaultHidden = computed(() =>
    this.known()
      .filter((column) => column.defaultHidden)
      .map((column) => column.id),
  );

  /** Hidden column ids in force: known, hideable, and never all of them. */
  protected readonly hidden = computed<readonly string[]>(() => {
    const known = this.known();
    const wanted = this.columnVisibility() ?? this.defaultHidden();
    const hidden = known.filter((column) => column.hideable && wanted.includes(column.id)).map((column) => column.id);
    return hidden.length >= known.length ? [] : hidden;
  });

  protected readonly table = injectTable<TableFeatureSet, TData>(() => {
    const rowId = this.rowId();
    return {
      features: TABLE_FEATURES,
      columns: [...this.columns()],
      data: [...this.data()],
      state: {
        columnVisibility: Object.fromEntries(this.hidden().map((id) => [id, false])),
        sorting: toSortingState(this.sorting()),
      },
      onSortingChange: (updater): void => {
        this.sorting.set(sortAfter(this.sorting(), updater));
      },
      ...(rowId === undefined ? {} : { getRowId: rowId }),
    };
  });

  protected readonly scrollerClasses = scrollerClasses;
  protected readonly tableClasses = tableClasses;
  protected readonly headerCellClasses = headerCellClasses;
  protected readonly cellClasses = cellClasses;
  protected readonly captionClasses = computed(() => captionVariants({ hidden: this.hideCaption() }));
  protected readonly ariaSort = ariaSort<TData>;

  protected readonly toggles = computed<readonly ColumnToggle[]>(() => {
    const hidden = this.hidden();
    const lastShown = this.known().length - hidden.length === 1;
    return this.known()
      .filter((column) => column.hideable)
      .map((column) => {
        const visible = !hidden.includes(column.id);
        return { id: column.id, label: column.label, visible, locked: visible && lastShown };
      });
  });
  protected readonly isDefault = computed(() => sameIds(this.hidden(), this.defaultHidden()));

  protected setVisible({ id, visible }: ColumnChoice): void {
    const hidden = this.hidden().filter((hiddenId) => hiddenId !== id);
    const next = visible ? hidden : [...hidden, id];
    if (next.length < this.known().length) {
      this.columnVisibility.set(next);
    }
  }

  protected resetColumns(): void {
    this.columnVisibility.set(undefined);
  }
}
