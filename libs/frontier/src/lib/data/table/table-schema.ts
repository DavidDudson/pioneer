import type { Type } from '@angular/core';
import { flexRenderComponent } from '@tanstack/angular-table';
import type { ColumnDef, RowData } from '@tanstack/angular-table';

import { DateDisplay, DateFormat } from '../../date/date.component';
import type { DateValue } from '../../date/date.component';
import type { BadgeTone } from '../../text/badge/badge.component';
import { Tag } from '../../text/tag/tag.component';
import type { Size } from '../../tokens';
import { tableColumns } from './table-features';
import type { FrontierColumnMeta, TableColumn, TableFeatureSet } from './table-features';

/** What sorting a column compares: text sorts by locale, numbers by size. */
export type SortValue = number | string;

/** A header and whether pressing it sorts the column. Sorting is on unless `sortable` is `false`. */
export interface ColumnOptions {
  /** Already translated: the schema never holds copy. */
  readonly header: string;
  readonly sortable?: boolean;
  /** Width in `fr-picker`, where rows are not a table; `fr-table` ignores it. Defaults to `md`. */
  readonly width?: Size;
  /** Lets the table's *Columns* panel hide it. Off unless set (a table with no such column has no panel); `defaultHidden` implies it. A table always keeps one column visible. */
  readonly hideable?: boolean;
  /** Hidden until shown, when the table has no remembered choice. */
  readonly defaultHidden?: boolean;
}

/** A column whose cells are a component, for content richer than text. */
export interface ComponentColumn<TRow extends RowData> extends ColumnOptions {
  readonly id: string;
  /** What the column sorts by; the rendered cell is separate. */
  readonly sortValue: (row: TRow) => SortValue;
  readonly component: Type<unknown>;
  /** The component's inputs for one row. */
  readonly inputs: (row: TRow) => Readonly<Record<string, unknown>>;
}

/** What a `fr-tag` cell shows for one row. */
export interface TagCell {
  readonly label: string;
  readonly tone?: BadgeTone;
}

/** A column of one of the row's string or number fields, shown as text. */
export interface TextColumn<TRow extends RowData> extends ColumnOptions {
  readonly id: string;
  readonly value: (row: TRow) => SortValue;
}

/** A column of a date, shown by `fr-date` and sorted chronologically. */
export interface DateColumn<TRow extends RowData> extends ColumnOptions {
  readonly id: string;
  readonly value: (row: TRow) => DateValue;
  readonly format?: DateFormat;
}

/** A column of a chip, shown by `fr-tag` and sorted by its label. */
export interface TagColumn<TRow extends RowData> extends ColumnOptions {
  readonly id: string;
  readonly value: (row: TRow) => TagCell;
}

/** The TanStack options a column's width, hiding and default visibility become. */
interface ColumnExtras {
  readonly meta?: FrontierColumnMeta;
}

function widthMeta(options: ColumnOptions): ColumnExtras {
  const meta: FrontierColumnMeta = {
    ...(options.width === undefined ? {} : { width: options.width }),
    ...(options.hideable === undefined ? {} : { hideable: options.hideable }),
    ...(options.defaultHidden === undefined ? {} : { defaultHidden: options.defaultHidden }),
  };
  return Object.keys(meta).length === 0 ? {} : { meta };
}

/** A column of any value type, before `columns()` unifies it with the rest. */
type AnyColumn<TRow extends RowData> = ColumnDef<TableFeatureSet, TRow, SortValue>;

/**
 * Builds the columns of an `fr-table` one typed step at a time. Each `add…` appends a column and returns the schema:
 *
 * ```ts
 * const columns = tableSchema<Member>()
 *   .addText({ id: 'name', header, value: (member) => member.name })
 *   .addDate({ id: 'joined', header, value: (member) => member.joined })
 *   .build();
 * ```
 *
 * frontier knows no Pioneer schemas, so the steps here are generic (text, date, tag, component). A `ui` library
 * adds the steps for its own kinds of row by extending this class, so they chain with the generic ones:
 * `class SpellTableSchema extends TableSchema<Spell> { addCost(): this { return this.addComponent(…); } }`.
 */
export class TableSchema<TRow extends RowData> {
  readonly #columns: TableColumn<TRow>[] = [];

  /** The finished columns, for `fr-table`'s `columns` input. Keep the result stable (a `computed` or a const). */
  public build(): readonly TableColumn<TRow>[] {
    return [...this.#columns];
  }

  /** Adds a column of text or numbers, sorted by its value. */
  public addText(options: TextColumn<TRow>): this {
    const column = tableColumns<TRow>();
    return this.#append(
      column.accessor(options.value, {
        id: options.id,
        header: options.header,
        enableSorting: options.sortable ?? true,
        ...widthMeta(options),
      }),
    );
  }

  /** Adds a column of dates, rendered by `fr-date` and sorted chronologically. */
  public addDate(options: DateColumn<TRow>): this {
    const format = options.format ?? DateFormat.Date;
    return this.addComponent({
      id: options.id,
      header: options.header,
      ...(options.sortable === undefined ? {} : { sortable: options.sortable }),
      ...(options.width === undefined ? {} : { width: options.width }),
      ...(options.hideable === undefined ? {} : { hideable: options.hideable }),
      ...(options.defaultHidden === undefined ? {} : { defaultHidden: options.defaultHidden }),
      sortValue: (row) => options.value(row).toString(),
      component: DateDisplay,
      inputs: (row) => ({ value: options.value(row), format }),
    });
  }

  /** Adds a column of one chip per row, rendered by `fr-tag` and sorted by its label. */
  public addTag(options: TagColumn<TRow>): this {
    return this.addComponent({
      id: options.id,
      header: options.header,
      ...(options.sortable === undefined ? {} : { sortable: options.sortable }),
      ...(options.width === undefined ? {} : { width: options.width }),
      ...(options.hideable === undefined ? {} : { hideable: options.hideable }),
      ...(options.defaultHidden === undefined ? {} : { defaultHidden: options.defaultHidden }),
      sortValue: (row) => options.value(row).label,
      component: Tag,
      inputs: (row) => {
        const { label, tone } = options.value(row);
        return tone === undefined ? { label } : { label, tone };
      },
    });
  }

  /**
   * Adds a column of any component. The step every richer one is made from: it keeps the rendered cell apart
   * from `sortValue`, so a chip or a glyph still sorts by something meaningful.
   */
  public addComponent(options: ComponentColumn<TRow>): this {
    const column = tableColumns<TRow>();
    return this.#append(
      column.accessor(options.sortValue, {
        id: options.id,
        header: options.header,
        enableSorting: options.sortable ?? true,
        ...widthMeta(options),
        cell: ({ row }) => flexRenderComponent(options.component, { inputs: options.inputs(row.original) }),
      }),
    );
  }

  /** The next schema, of the same class so a subclass's steps keep chaining. */
  #append(column: AnyColumn<TRow>): this {
    this.#columns.push(...tableColumns<TRow>().columns([column]));
    return this;
  }
}

/** Starts a column schema for rows of `TRow`: `tableSchema<Member>().addText(…).build()`. */
export function tableSchema<TRow extends RowData>(): TableSchema<TRow> {
  return new TableSchema<TRow>();
}
