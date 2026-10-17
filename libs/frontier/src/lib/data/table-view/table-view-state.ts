import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import type { Params } from '@angular/router';

import type { FilterCondition } from '../../controls/filter-bar/filter-bar.types';
import { decodeTableView, encodeTableView } from './table-view';
import { TableViewKey } from './table-view-keys';
import type { TableView, TableViewSchema, TableViewSort } from './table-view.types';

/** Maps the filter bar's conditions to and from the `f` segment, by the page's facet codec. */
export interface FacetTextCodec {
  readonly encode: (filters: readonly FilterCondition[]) => string;
  readonly decode: (text: string) => readonly FilterCondition[];
}

export interface TableViewOptions {
  /** Or a function of signals, for a table whose columns change with the page (a kind picked). */
  readonly schema: TableViewSchema | (() => TableViewSchema);
  /** Without one, the bar's filters are not kept in the URL. */
  readonly facets?: FacetTextCodec;
}

export interface ApplyOptions {
  /** Replace the history entry instead of pushing one. */
  readonly replaceUrl?: boolean;
  /** The page's own params to write in the same navigation. */
  readonly params?: Params;
}

const TABLE_KEYS: readonly string[] = Object.values(TableViewKey);
const NO_FILTERS: readonly FilterCondition[] = [];

/** Every table key, the ones the view leaves out as `undefined`, which the router removes from the URL. */
function paramsFor(view: TableView, schema: TableViewSchema): Params {
  const written = encodeTableView(view, schema);
  return Object.fromEntries(TABLE_KEYS.map((key) => [key, written[key]]));
}

/**
 * A table's view held in the URL's query string. Bind it with one-way inputs and the matching outputs:
 *
 * ```html
 * <fr-filter-bar [fields]="fields" [value]="view.filters()" (valueChange)="view.setFilters($event)" />
 * <fr-table [sorting]="view.sorting()" (sortingChange)="view.setSorting($event)"
 *           [columnVisibility]="view.hidden()" (columnVisibilityChange)="view.setHidden($event)" … />
 * ```
 *
 * Changes navigate on the current route and leave the page's other params alone. Typing in a search box replaces
 * the history entry instead of pushing one, so Back leaves the page and not each keystroke.
 */
export class TableViewState {
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #schema: () => TableViewSchema;
  readonly #facets: FacetTextCodec | undefined;
  readonly #query = toSignal(this.#route.queryParams, { initialValue: this.#route.snapshot.queryParams });

  /** The view the URL holds right now. */
  public readonly view: Signal<TableView>;
  public readonly sorting: Signal<readonly TableViewSort[]>;
  /** The hidden column ids; `undefined` is each column's default. */
  public readonly hidden: Signal<readonly string[] | undefined>;
  public readonly filters: Signal<readonly FilterCondition[]>;
  public readonly search: Signal<string>;
  /** `undefined` is the table's default page size. */
  public readonly pageSize: Signal<number | undefined>;

  public constructor(options: TableViewOptions) {
    const { schema } = options;
    this.#schema = typeof schema === 'function' ? schema : (): TableViewSchema => schema;
    this.#facets = options.facets;
    this.view = computed(() => decodeTableView(this.#query(), this.#schema()));
    this.sorting = computed(() => this.view().sort ?? []);
    this.hidden = computed(() => this.view().hidden);
    this.filters = computed(() => this.#decodeFilters(this.view().facets));
    this.search = computed(() => this.view().search ?? '');
    this.pageSize = computed(() => this.view().pageSize);
  }

  public async setSorting(sorting: readonly TableViewSort[]): Promise<void> {
    await this.apply({ sort: sorting });
  }

  public async setHidden(hidden: readonly string[] | undefined): Promise<void> {
    await this.apply({ hidden });
  }

  public async setFilters(filters: readonly FilterCondition[]): Promise<void> {
    await this.apply({ facets: this.#facets?.encode(filters) });
  }

  public async setPageSize(pageSize: number | undefined): Promise<void> {
    await this.apply({ pageSize });
  }

  /** The search text as typed: replaces the history entry. */
  public async setSearch(search: string): Promise<void> {
    await this.apply({ search }, { replaceUrl: true });
  }

  #decodeFilters(text: string | undefined): readonly FilterCondition[] {
    return text === undefined || this.#facets === undefined ? NO_FILTERS : this.#facets.decode(text);
  }

  /**
   * Changes several parts of the view in one navigation, and the page's own params with them (`params`, where
   * `undefined` removes one). The setters are this with one part.
   */
  public async apply(patch: Partial<TableView>, options: ApplyOptions = {}): Promise<void> {
    const next: TableView = { ...this.view(), ...patch };
    await this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { ...options.params, ...paramsFor(next, this.#schema()) },
      queryParamsHandling: 'merge',
      replaceUrl: options.replaceUrl ?? false,
    });
  }
}

/** Holds a table's view in the current route's query string. Call in an injection context (a field initialiser). */
export function injectTableView(options: TableViewOptions): TableViewState {
  return new TableViewState(options);
}
