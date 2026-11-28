import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { FlexRender, injectTable } from '@tanstack/angular-table';
import type { RowData, SortingState, Updater } from '@tanstack/angular-table';
import { cva } from 'class-variance-authority';

import { Button } from '../../actions/button/button.component';
import { injectTranslate } from '../../locale/inject-translate';
import { elevationVariants, figureClasses } from '../../tokens';
import { TableDensity } from '../table-view/table-view-store';
import type { TableViewSort } from '../table-view/table-view.types';
import { ColumnChooser } from './column-chooser/column-chooser.component';
import type { ColumnChoice, ColumnToggle } from './column-chooser/column-chooser.component';
import { TableHeaderCell } from './header-cell/header-cell.component';
import { TableDensityControl } from './table-density/table-density.component';
import { HEADER_KEY, TABLE_FEATURES } from './table-features';
import type { TableColumn, TableFeatureSet, TableHeader } from './table-features';
import { sortAfter, toSortingState } from './table-sort';

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

function ariaSort<TData extends RowData>(header: TableHeader<TData>): string | undefined {
  const sorted = header.column.getIsSorted();

  return sorted === false ? undefined : ARIA_SORT[sorted];
}

const TableMessage = {
  LoadMore: 'frontier.table.loadMore',
  LoadingMore: 'frontier.table.loadingMore',
} as const;

/** `isolate` keeps the pinned cells' z-index inside the table; a sticky header needs a height to scroll under. */
const scrollerVariants = cva('block w-full overflow-x-auto', {
  variants: {
    stickyHeader: { true: 'max-h-picker overflow-y-auto', false: '' },
    pinned: { true: 'isolate', false: '' },
  },
});

const footerVariants = cva('justify-center pt-sm', { variants: { shown: { true: 'flex', false: 'hidden' } } });
const statusClasses = cva('sr-only')();
const tableClasses = cva(['w-full border-collapse font-ui text-body', figureClasses])();

const captionVariants = cva('pb-xs text-start text-label font-medium text-fg-muted', {
  variants: { hidden: { true: 'sr-only', false: '' } },
});

const headerCellVariants = cva(
  `border-b px-sm text-start text-label font-medium text-fg-muted ${elevationVariants.raised}`,
  {
    variants: {
      density: { comfortable: 'py-xs', compact: 'py-3xs' },
      /** The header row stays at the top, the first column at the start; where they cross, the corner stays over both. */
      pin: {
        none: '',
        header: 'sticky top-none z-sticky',
        column: 'sticky start-none z-sticky',
        corner: 'sticky start-none top-none z-overlay',
      },
    },
  },
);

const densitySwitchVariants = cva('pb-xs', { variants: { shown: { true: '', false: 'hidden' } } });

const cellVariants = cva('border-b border-line-subtle px-sm text-fg-default', {
  variants: {
    density: { comfortable: 'py-xs', compact: 'py-3xs' },
    pin: { none: '', column: 'sticky start-none z-sticky bg-elevation-flat' },
  },
});

/** What the *Columns* control needs to know of a column. */
interface KnownColumn {
  readonly id: string;
  /** The header's message key, or the id for a header that is not one. */
  readonly label: string;
  /** Whether `label` is a message key, so a header that is not one is shown as it is. */
  readonly translated: boolean;
  readonly hideable: boolean;
  readonly defaultHidden: boolean;
}

/** A column's id, or nothing for a column with none (a group, or a display column given no id). */
function describe<TData extends RowData>(column: TableColumn<TData>): Array<KnownColumn> {
  const id = column.id ?? ('accessorKey' in column ? String(column.accessorKey) : undefined);

  if (id === undefined) {
    return [];
  }

  const header = HEADER_KEY.safeParse(column.header);

  return [
    {
      id,
      label: header.success ? header.data : id,
      translated: header.success,
      hideable: column.meta?.hideable === true || column.meta?.defaultHidden === true,
      defaultHidden: column.meta?.defaultHidden === true,
    },
  ];
}

type HeaderPin = 'none' | 'header' | 'column' | 'corner';

/** The classes of a row's first cell and of the others. */
interface PinnedClasses {
  readonly first: string;
  readonly rest: string;
}

/** How the first header cell is pinned: over both directions at the corner. */
function headerPin(header: boolean, column: boolean): HeaderPin {
  if (header && column) {
    return 'corner';
  }

  if (header) {
    return 'header';
  }

  return column ? 'column' : 'none';
}

function sameIds(left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean {
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
 * columns, so a page can keep them in its URL (see `injectTableView`). Pressing a header with Shift held adds the
 * column to the sort instead of replacing it, and each sorted column shows its place once there are several.
 *
 * A table over a server's list sets `manualSorting` (the rows arrive sorted; `sorting` only reports the choice) and
 * `hasMore`: a *Load more* button follows the rows and emits `loadMore`, busy while `loadingMore`.
 * `stickyHeader` and `stickyFirstColumn` keep the header row and the first column in view as the table scrolls.
 */
@Component({
  selector: 'fr-table',
  imports: [Button, ColumnChooser, FlexRender, TableDensityControl, TableHeaderCell],
  templateUrl: './table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Table<TData extends RowData> {
  public readonly data = input.required<ReadonlyArray<TData>>();
  public readonly columns = input.required<ReadonlyArray<TableColumn<TData>>>();
  /** Accessible name; shown above the table unless `hideCaption`. */
  public readonly caption = input.required<string>();
  public readonly hideCaption = input(false, { transform: booleanAttribute });
  public readonly rowId = input<((row: TData) => string) | undefined>(undefined);
  /** Ids of the hidden columns; `undefined` is each column's `defaultHidden`. */
  public readonly columnVisibility = model<ReadonlyArray<string> | undefined>(undefined);
  /** The sorted columns, first wins; pressing a header changes it. Empty is the order of `data`. */
  public readonly sorting = model<ReadonlyArray<TableViewSort>>([]);
  /** Row spacing. Comfortable until the user picks compact (`showDensity`) or the page sets it. */
  public readonly density = model<TableDensity>(TableDensity.Comfortable);
  /** The rows come in the order `sorting` asks for, from the server: the table reports a sort and does not apply it. */
  public readonly manualSorting = input(false, { transform: booleanAttribute });
  /** There are more rows to fetch: shows *Load more* after the rows. */
  public readonly hasMore = input(false, { transform: booleanAttribute });
  /** The next rows are on their way: *Load more* is busy and presses are ignored. */
  public readonly loadingMore = input(false, { transform: booleanAttribute });
  /** Keeps the header row at the top of the table's own scroll area. */
  public readonly stickyHeader = input(false, { transform: booleanAttribute });
  /** Keeps the first column at the start while the table scrolls sideways. */
  public readonly stickyFirstColumn = input(false, { transform: booleanAttribute });
  /** The user asked for the next rows. */
  public readonly loadMore = output();
  /** Shows the *Row density* switch beside the *Columns* control. */
  public readonly showDensity = input(false, { transform: booleanAttribute });

  /** Every column, with what the *Columns* control needs of it. Read from the definitions, before the table exists. */
  private readonly known = computed(() => this.columns().flatMap((column) => describe(column)));
  private readonly defaultHidden = computed(() =>
    this.known()
      .filter((column) => column.defaultHidden)
      .map((column) => column.id),
  );

  /** Hidden column ids in force: known, hideable, and never all of them. */
  protected readonly hidden = computed<ReadonlyArray<string>>(() => {
    const known = this.known();
    const wanted = this.columnVisibility() ?? this.defaultHidden();
    const hidden = known.filter((column) => column.hideable && wanted.includes(column.id)).map((column) => column.id);

    return hidden.length >= known.length ? [] : hidden;
  });

  protected readonly table = injectTable<TableFeatureSet, TData>(() => {
    const rowId = this.rowId();

    const options = {
      features: TABLE_FEATURES,
      columns: [...this.columns()],
      data: [...this.data()],
      manualSorting: this.manualSorting(),
      state: {
        columnVisibility: Object.fromEntries(this.hidden().map((id) => [id, false])),
        sorting: toSortingState(this.sorting()),
      },
      onSortingChange: (updater: Updater<SortingState>): void => {
        this.sorting.set(sortAfter(this.sorting(), updater));
      },
    };

    return rowId === undefined ? options : { ...options, getRowId: rowId };
  });

  protected readonly scrollerClasses = computed(() =>
    scrollerVariants({ stickyHeader: this.stickyHeader(), pinned: this.stickyHeader() || this.stickyFirstColumn() }),
  );
  protected readonly footerClasses = computed(() => footerVariants({ shown: this.hasMore() }));
  protected readonly tableClasses = tableClasses;
  protected readonly headerCellClasses = computed<PinnedClasses>(() => {
    const density = this.density();
    const header = this.stickyHeader();
    const column = this.stickyFirstColumn();

    return {
      first: headerCellVariants({ density, pin: headerPin(header, column) }),
      rest: headerCellVariants({ density, pin: header ? 'header' : 'none' }),
    };
  });
  protected readonly densitySwitchClasses = computed(() => densitySwitchVariants({ shown: this.showDensity() }));
  protected readonly cellClasses = computed<PinnedClasses>(() => {
    const density = this.density();

    return {
      first: cellVariants({ density, pin: this.stickyFirstColumn() ? 'column' : 'none' }),
      rest: cellVariants({ density, pin: 'none' }),
    };
  });
  protected readonly loadMoreLabel = computed(() => {
    const translate = this.#translate();

    return translate(this.loadingMore() ? TableMessage.LoadingMore : TableMessage.LoadMore);
  });
  protected readonly statusClasses = statusClasses;
  /** Said to a screen reader while the next rows load, and nothing otherwise. */
  protected readonly status = computed(() => (this.loadingMore() ? this.loadMoreLabel() : ''));

  protected headerClass(first: boolean): string {
    const classes = this.headerCellClasses();

    return first ? classes.first : classes.rest;
  }

  protected cellClass(first: boolean): string {
    const classes = this.cellClasses();

    return first ? classes.first : classes.rest;
  }
  protected readonly captionClasses = computed(() => captionVariants({ hidden: this.hideCaption() }));
  protected readonly ariaSort = ariaSort<TData>;

  readonly #translate = injectTranslate();

  protected readonly toggles = computed<ReadonlyArray<ColumnToggle>>(() => {
    const translate = this.#translate();
    const hidden = this.hidden();
    const lastShown = this.known().length - hidden.length === 1;

    return this.known()
      .filter((column) => column.hideable)
      .map((column) => {
        const visible = !hidden.includes(column.id);

        return {
          id: column.id,
          label: column.translated ? translate(column.label) : column.label,
          visible,
          locked: visible && lastShown,
        };
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
