import { Combobox as AriaCombobox, ComboboxPopup } from '@angular/aria/combobox';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideChevronDown } from '@lucide/angular';
import { injectDebouncer } from '@tanstack/angular-pacer';
import { functionalUpdate, injectTable } from '@tanstack/angular-table';
import type { Row, SortingState, Updater } from '@tanstack/angular-table';
import { cva } from 'class-variance-authority';

import { TABLE_FEATURES } from '../../data/table/table-features';
import type { TableColumn, TableFeatureSet } from '../../data/table/table-features';
import { Icon } from '../../icon/icon.component';
import { uniqueId } from '../../ids';
import { Control } from '../control';
import { controlVariants } from '../control.variants';
import { SEARCH_DEBOUNCE } from '../search-input/search-input.component';
import { PickerGrid } from './picker-grid.component';
import { pickerPanelClasses, pickerSearchClasses } from './picker.variants';

/** What the rows are ordered by: one column, which the caller sorts by on the server. */
export interface PickerSort {
  /** The column's `id` in the schema. */
  readonly column: string;
  readonly descending: boolean;
}

interface Picked<TValue extends string> {
  readonly value: TValue | undefined;
  readonly label: string | undefined;
}

/** A press inside the panel keeps focus where it is, or the panel would close before the press lands. */
function keepFocus(event: Event): void {
  const onField = event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement;
  if (!onField) {
    event.preventDefault();
  }
}

const triggerLabelVariants = cva('', { variants: { empty: { true: 'text-fg-subtle', false: '' } } });

/**
 * Plain single pick from a table, opened inline below the trigger (never a popover): a search box, sortable
 * columns and the picked row marked. On `@angular/aria` (combobox over a grid): focus stays in the search box
 * and the arrow keys move the highlight, so a pick is Enter or a press on a row. A column sorts from its header
 * button, which Tab reaches from the search box.
 *
 * Everything the rows depend on is the caller's: `searched` fires with the typed query once typing goes quiet
 * (`SEARCH_DEBOUNCE`), and again on open when the list is for another query; `sorted` fires with the column to
 * order by. Both start the rows over, and the caller passes back the first rows with `loading` while they load.
 * The rest come as the list is scrolled: `loadMore` fires once the end is near while `hasMore`, and the caller
 * appends them with `loadingMore` while they load. Columns come from `tableSchema<Row>()…build()`, so a cell can
 * be a component.
 *
 * `committed` fires on a pick; Escape closes and fires `cancelled`. In a form use `fr-picker-field`.
 */
@Component({
  selector: 'fr-picker',
  imports: [AriaCombobox, ComboboxPopup, Icon, PickerGrid, TranslocoPipe],
  templateUrl: './picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '(focusout)': 'focusOut($event)' },
})
export class Picker<TValue extends string, TRow extends object> extends Control {
  /** The picked value; `undefined` until the user picks. */
  public readonly value = model<TValue | undefined>(undefined);
  /** The rows for the last `searched` and `sorted`, with every page loaded so far. */
  public readonly rows = input.required<readonly TRow[]>();
  public readonly columns = input.required<readonly TableColumn<TRow>[]>();
  /** A row's value; also its identity. */
  public readonly rowValue = input.required<(row: TRow) => TValue>();
  /** What the trigger shows for the picked row. */
  public readonly rowLabel = input.required<(row: TRow) => string>();
  /** Why a row can't be picked, already translated; `undefined` when it can. The reason shows in the row. */
  public readonly rowDisabled = input<(row: TRow) => string | undefined>(() => undefined);
  /** The first rows of a query are loading: the panel shows skeleton rows in place of the old rows. */
  public readonly loading = input(false, { transform: booleanAttribute });
  /** More rows are loading; skeleton rows follow the loaded ones. */
  public readonly loadingMore = input(false, { transform: booleanAttribute });
  /** There are rows past the loaded ones: scrolling near the end fires `loadMore`. */
  public readonly hasMore = input(false, { transform: booleanAttribute });
  /** Defaults to "Select…" in the viewer's locale. */
  public readonly placeholder = input<string | undefined>(undefined);
  /** Opens the panel once the control has rendered, for an inline editor that exists to pick. */
  public readonly openOnInit = input(false, { transform: booleanAttribute });
  /** The typed query, debounced; empty on open when the rows are for another query. */
  public readonly searched = output<string>();
  /** The column to order by, or `undefined` for the source's own order. */
  public readonly sorted = output<PickerSort | undefined>();
  /** The end of the loaded rows is near and `hasMore`: append the next ones. */
  public readonly loadMore = output();

  protected readonly expanded = signal(false);
  protected readonly query = signal('');
  /** Counts the times the rows started over, for the grid to scroll back to the top. */
  protected readonly generation = signal(0);
  readonly #sorting = signal<SortingState>([]);

  protected readonly table = injectTable<TableFeatureSet, TRow>(() => {
    const rowValue = this.rowValue();
    return {
      features: TABLE_FEATURES,
      columns: [...this.columns()],
      data: [...this.rows()],
      getRowId: (row: TRow): string => rowValue(row),
      manualSorting: true,
      state: { sorting: this.#sorting() },
      onSortingChange: (updater: Updater<SortingState>): void => {
        this.#sort(functionalUpdate(updater, untracked(this.#sorting)));
      },
    };
  });
  protected readonly headers = computed(() => this.table.getHeaderGroups()[0]?.headers ?? []);
  protected readonly bodyRows = computed(() => this.table.getRowModel().rows);

  /** The picked value and its label, once a row for it has loaded. */
  readonly #picked = computed<Picked<TValue>>(
    () => {
      const value = this.value();
      if (value === undefined || value === '') {
        return { value: undefined, label: undefined };
      }
      const row = this.bodyRows().find((candidate) => candidate.id === value);
      return { value, label: row === undefined ? undefined : this.rowLabel()(row.original) };
    },
    { equal: (left, right) => left.value === right.value && left.label === right.label },
  );
  /** The picked row's last known label, kept while a search or sort leaves the row out. */
  protected readonly pickedLabel = linkedSignal<Picked<TValue>, string | undefined>({
    source: this.#picked,
    computation: (picked, previous) => {
      if (picked.label !== undefined || previous === undefined) {
        return picked.label;
      }
      return previous.source.value === picked.value ? previous.value : undefined;
    },
  });
  protected readonly triggerLabel = computed(() => this.pickedLabel() ?? this.placeholder());
  protected readonly labelClasses = computed(() => triggerLabelVariants({ empty: this.pickedLabel() === undefined }));

  protected readonly panelId = uniqueId('fr-picker');
  protected readonly CaretIcon = LucideChevronDown;
  protected readonly triggerClasses = controlVariants({ trigger: true });
  protected readonly panelClasses = pickerPanelClasses;
  protected readonly searchClasses = pickerSearchClasses;
  protected readonly searchInputClasses = controlVariants();

  protected readonly keepFocus = keepFocus;
  protected readonly search = viewChild<ElementRef<HTMLInputElement>>('search');

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #injector = inject(Injector);
  /** The query `searched` last fired; undefined until it first fires. */
  #lastSearched: string | undefined;
  /** Cancelled on destroy, so a pending query never fires after the control is gone. */
  readonly #debouncer = injectDebouncer(
    (query: string) => {
      // The panel closed since this keystroke.
      if (query === this.query()) {
        this.#search(query);
      }
    },
    { wait: SEARCH_DEBOUNCE },
  );

  public constructor() {
    super();
    afterNextRender(() => {
      if (this.openOnInit() && !this.disabled()) {
        this.#open();
      }
    });
  }

  protected toggle(): void {
    if (this.expanded()) {
      this.#close(true);
    } else {
      this.#open();
    }
  }

  protected type(query: string): void {
    this.query.set(query);
    this.#debouncer.maybeExecute(query);
  }

  protected pick(row: Row<TableFeatureSet, TRow>): void {
    this.value.set(this.rowValue()(row.original));
    this.#close(true);
    this.committed.emit();
  }

  protected cancel(): void {
    this.#debouncer.cancel();
    if (this.expanded()) {
      this.#close(true);
    }
    this.cancelled.emit();
  }

  protected focusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (this.expanded() && !(next instanceof Node && this.#host.nativeElement.contains(next))) {
      this.#close(false);
    }
  }

  #open(): void {
    this.expanded.set(true);
    this.#search(this.query());
    afterNextRender(
      () => {
        this.search()?.nativeElement.focus();
      },
      { injector: this.#injector },
    );
  }

  #close(refocus: boolean): void {
    this.#debouncer.cancel();
    this.expanded.set(false);
    this.query.set('');
    if (refocus) {
      this.#host.nativeElement.querySelector('button')?.focus();
    }
  }

  #sort(sorting: SortingState): void {
    this.#sorting.set(sorting);
    this.generation.update((count) => count + 1);
    const [first] = sorting;
    this.sorted.emit(first === undefined ? undefined : { column: first.id, descending: first.desc });
  }

  #search(query: string): void {
    if (query === this.#lastSearched) {
      return;
    }
    this.#lastSearched = query;
    this.generation.update((count) => count + 1);
    this.searched.emit(query);
  }
}
