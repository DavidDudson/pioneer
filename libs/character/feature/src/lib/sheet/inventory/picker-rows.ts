import { computed, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import type { PickerSort } from '@pioneer/frontier/data';

/** How a short list is searched and ordered in the page: the text a query reads, and each column's sort key. */
export interface RowOrder<TRow> {
  readonly text: (row: TRow) => string;
  readonly sortKey: Readonly<Record<string, (row: TRow) => number | string>>;
}

/** What the picker asked for: the words typed and the column ordered by, if any. */
export interface RowView {
  readonly query: string;
  readonly sort: PickerSort | undefined;
}

/** The rows whose text holds the query, in the order asked for, then by their text; a column with no key is left unsorted. */
export function shownRows<TRow>(rows: readonly TRow[], view: RowView, order: RowOrder<TRow>): readonly TRow[] {
  const needle = view.query.trim().toLocaleLowerCase();
  const matching = rows.filter((row) => order.text(row).toLocaleLowerCase().includes(needle));
  const { sort } = view;
  const key = sort === undefined ? undefined : order.sortKey[sort.column];
  if (sort === undefined || key === undefined) {
    return matching;
  }
  const direction = sort.descending ? -1 : 1;
  return matching.toSorted((left, right) => {
    const leftKey = key(left);
    const rightKey = key(right);
    const compared =
      typeof leftKey === 'number' && typeof rightKey === 'number'
        ? leftKey - rightKey
        : String(leftKey).localeCompare(String(rightKey));
    return direction * (compared || order.text(left).localeCompare(order.text(right)));
  });
}

/** A short list a picker shows: the query and sort the picker reports, and the rows they leave. Held by the page. */
export class PickerRows<TRow> {
  public readonly all: Signal<readonly TRow[]>;
  public readonly query: WritableSignal<string> = signal('');
  public readonly ordering: WritableSignal<PickerSort | undefined> = signal(undefined);
  public readonly shown: Signal<readonly TRow[]>;

  public constructor(all: Signal<readonly TRow[]>, order: RowOrder<TRow>) {
    this.all = all;
    this.shown = computed(() => shownRows(this.all(), { query: this.query(), sort: this.ordering() }, order));
  }
}
