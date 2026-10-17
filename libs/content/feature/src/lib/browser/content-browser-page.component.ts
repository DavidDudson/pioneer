import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import type { Params } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucidePackageSearch } from '@lucide/angular';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Button,
  EmptyState,
  FilterBar,
  FilterChips,
  LocaleFormat,
  Page,
  PageBody,
  PageHeader,
  SearchInput,
  Skeleton,
  Stack,
  Text,
} from '@pioneer/frontier';
import type { AsyncQuery, FilterCondition, SelectOption } from '@pioneer/frontier';
import { injectTableView, Table, tableViewColumns } from '@pioneer/frontier/data';
import type { TableColumn, TableView, TableViewSchema } from '@pioneer/frontier/data';
import { filterParamName } from '@pioneer/rules/sdk';
import type { ContentEntry, FilterState, QueryParams } from '@pioneer/rules/sdk';
import { FacetFilterView, RARITY_TONES } from '@pioneer/rules/ui';
import type { Chip } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';

import { entryTarget } from '../entry/entry-lookup';
import { browseColumns } from './browse-columns';
import {
  ALL_FACETS,
  BROWSE_KINDS,
  facetsOf,
  isBrowseKind,
  KIND_MESSAGES,
  KIND_PARAM,
  kindsFromQuery,
  kindsToQuery,
} from './browse-kinds';
import type { BrowseKind } from './browse-kinds';
import { browseList, entriesOf } from './browse-list';
import type { BrowseList } from './browse-list';
import { injectBrowseRegistry } from './browse-registry';
import type { BrowseRow } from './browse-row';
import { injectBrowseSearch, searchFromQuery } from './browse-search';
import type { BrowseSearch } from './browse-search';
import { facetTextCodec } from './facet-text';
import { filterConditions, filterFields, filterState } from './filter-bar-state';

const NO_PARAMS: QueryParams = {};

/** How many entries the table shows at first and each time "Show more" is pressed. */
const PAGE_SIZE = 100;

/** Every facet's query param cleared, so a facet the new list drops leaves the URL. */
const CLEARED: Readonly<Record<string, undefined>> = Object.fromEntries(
  ALL_FACETS.map((facet) => [filterParamName(facet.id), undefined]),
);

const BrowseMessage = {
  Title: 'content.page.title',
  Description: 'content.page.description',
  Kinds: 'content.kind.label',
  Caption: 'content.list.caption',
  LoadError: 'content.list.loadError',
  SearchError: 'content.list.searchError',
  SearchLabel: 'content.search.label',
  Count: 'content.list.count',
  More: 'content.list.more',
  EmptyTitle: 'content.list.emptyTitle',
  EmptyDescription: 'content.list.emptyDescription',
  SearchEmptyDescription: 'content.list.searchEmptyDescription',
} as const;

/** Placeholder rows while the entries load. */
const LOADING_ROWS = ['first', 'second', 'third', 'fourth'];

const rowIdOf = (row: BrowseRow): string => row.id;

/**
 * The public content browser (content-model.md, "Filters"): pick the kinds to list, narrow them with each kind's
 * facets, and read the entries left in a table, or search them by words. The kinds, the words and the filters are in the
 * URL (`kind`, and the table view's `q`, `f`, `s`, `c`; ADR-0068), so a filtered list is a link and back and forward restore it. The entries come from
 * the cached mechanics bundles, so filtering is instant and works offline; the words are matched by the server, which
 * ranks the entries, and the filters then apply to what it found.
 */
@Component({
  selector: 'pio-content-browser-page',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Button,
    EmptyState,
    FacetFilterView,
    FilterBar,
    FilterChips,
    Page,
    PageBody,
    PageHeader,
    SearchInput,
    Skeleton,
    Stack,
    Table,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './content-browser-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentBrowserPage {
  readonly #route = inject(ActivatedRoute);
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #params = toSignal(this.#route.queryParams, { initialValue: NO_PARAMS });
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Re-read when the messages load or the language changes, so a header or a kind is never a raw key. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly Message = BrowseMessage;
  protected readonly emptyIcon = LucidePackageSearch;
  protected readonly loadingRows = LOADING_ROWS;

  protected readonly kinds: Signal<readonly BrowseKind[]> = computed(() => kindsFromQuery(this.#params()[KIND_PARAM]));
  protected readonly kindOptions: Signal<readonly SelectOption<BrowseKind>[]> = computed(() => {
    this.#messages();
    return BROWSE_KINDS.map((kind) => ({ value: kind, label: this.#i18n.translate(KIND_MESSAGES[kind]) }));
  });
  protected readonly kindSet: Signal<ReadonlySet<BrowseKind>> = computed(() => new Set(this.kinds()));

  readonly #facets = computed(() => facetsOf(this.kinds()));
  /**
   * The table's view in the URL: sort (`s`), filters (`f`), hidden columns (`c`) and words (`q`). The kinds stay the
   * page's own param. The filters are the bar's chips, and `state` is what they mean for this list's facets.
   */
  readonly #codec = facetTextCodec(() => this.#facets());
  protected readonly view = injectTableView({
    schema: (): TableViewSchema => this.viewSchema(),
    facets: this.#codec,
  });
  protected readonly state: Signal<FilterState> = computed(() => filterState(this.view.filters(), this.#facets()));

  protected readonly registry = injectBrowseRegistry(() => this.kinds());
  readonly #entries: Signal<readonly ContentEntry[] | undefined> = computed(() => {
    const registry = this.registry.data();
    return registry === undefined ? undefined : entriesOf(registry, this.kinds());
  });

  /** The words in the link, if any: with them the list is what the server's search found. */
  protected readonly words = computed(() => searchFromQuery(this.view.search()));
  protected readonly searching = computed(() => this.words() !== undefined);
  readonly #criteria: Signal<BrowseSearch | undefined> = computed(() => {
    const words = this.words();
    return words === undefined ? undefined : { words, kinds: this.kinds() };
  });
  protected readonly search = injectBrowseSearch(() => this.#criteria());

  protected readonly list: Signal<BrowseList | undefined> = computed(() => {
    const entries = this.#entries();
    if (entries === undefined) {
      return undefined;
    }
    const matches = this.searching() ? this.search.data() : undefined;
    if (this.searching() && matches === undefined) {
      return undefined;
    }
    return browseList({ entries, facets: this.#facets(), state: this.state(), matches }, (left, right) =>
      this.#format.compare(left, right),
    );
  });

  /** The list once the bundles and, while searching, the matches have loaded; the region around the table follows it. */
  protected readonly browse: AsyncQuery<BrowseList> = {
    data: this.list,
    error: computed(() => (this.registry.isError() ? this.registry.error() : this.search.error())),
    isPending: () => this.registry.isPending() || (this.searching() && this.search.isPending()),
    isError: () => this.registry.isError() || (this.searching() && this.search.isError()),
  };

  readonly #limit = signal(PAGE_SIZE);
  protected readonly rows: Signal<readonly BrowseRow[]> = computed(() => {
    this.#messages();
    return (this.list()?.entries ?? []).slice(0, this.#limit()).map((entry) => this.#rowOf(entry));
  });
  protected readonly total = computed(() => this.list()?.entries.length ?? 0);
  protected readonly hasMore = computed(() => this.rows().length < this.total());

  protected readonly columns: Signal<readonly TableColumn<BrowseRow>[]> = computed(() => {
    this.#messages();
    return browseColumns((key) => this.#i18n.translate(key), this.kinds().length === 1);
  });
  /** The columns a shared view can name, and which start hidden for the kinds listed. */
  protected readonly viewSchema: Signal<TableViewSchema> = computed(() => ({
    columns: tableViewColumns(this.columns()),
  }));
  protected readonly rowId = rowIdOf;

  /** What the filter bar offers: a field per facet of the list, labelled in the UI language. */
  protected readonly fields = computed(() => {
    this.#messages();
    return filterFields(this.list()?.counts ?? [], (key) => this.#i18n.translate(key));
  });

  /** Another set of kinds: the filters the new list still has stay, the others leave the link. */
  protected async pickKinds(picked: ReadonlySet<BrowseKind>): Promise<void> {
    const kinds = BROWSE_KINDS.filter((kind) => picked.has(kind));
    const kept = facetTextCodec(() => facetsOf(kinds)).encode(this.view.filters());
    await this.#write({ facets: kept }, { [KIND_PARAM]: kinds.length === 0 ? undefined : kindsToQuery(kinds) });
  }

  protected async filter(state: FilterState): Promise<void> {
    await this.filtered(filterConditions(state));
  }

  protected async filtered(conditions: readonly FilterCondition[]): Promise<void> {
    await this.#write({ facets: this.#codec.encode(conditions) });
  }

  protected async searched(words: string): Promise<void> {
    await this.#write({ search: searchFromQuery(words) ?? '' });
  }

  protected more(): void {
    this.#limit.update((limit) => limit + PAGE_SIZE);
  }

  #rowOf(entry: ContentEntry): BrowseRow {
    const tone = RARITY_TONES[entry.rarity];
    const traits = entry.traits.map((trait): Chip => ({ label: trait, tone }));
    return {
      id: entry.id,
      name: entry.name,
      to: entryTarget(entry),
      kind: isBrowseKind(entry.kind) ? this.#i18n.translate(KIND_MESSAGES[entry.kind]) : '',
      level: this.#levelText(entry),
      traits,
      sources: entry.sources,
    };
  }

  /** A kit has no level, so it is read where an entry has one. */
  #levelText(entry: ContentEntry): string {
    return 'level' in entry && typeof entry.level === 'number' ? this.#format.number(entry.level) : '';
  }

  /**
   * A new list, new filters or new words are a new history entry, so back and forward restore the last one. Params
   * from before the table view (`f.<facet>`) leave the link with the next change.
   */
  async #write(patch: Partial<TableView>, params: Params = {}): Promise<void> {
    this.#limit.set(PAGE_SIZE);
    await this.view.apply(patch, { params: { ...CLEARED, ...params } });
  }
}
