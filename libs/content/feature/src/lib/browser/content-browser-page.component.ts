import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucidePackageSearch } from '@lucide/angular';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Button,
  EmptyState,
  FilterChips,
  LocaleFormat,
  Page,
  Skeleton,
  Stack,
  Text,
} from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { Table } from '@pioneer/frontier/data';
import type { TableColumn } from '@pioneer/frontier/data';
import { filterFromQuery, filterParamName, filterToQuery } from '@pioneer/rules/sdk';
import type { ContentEntry, FilterState, QueryParams } from '@pioneer/rules/sdk';
import { FacetFilterView, RARITY_TONES, RulesTableSchema } from '@pioneer/rules/ui';
import type { Chip } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';

import { entryTarget } from '../entry/entry-lookup';
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
import { BrowseColumn } from './browse-row';
import type { BrowseRow } from './browse-row';

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
  Count: 'content.list.count',
  More: 'content.list.more',
  EmptyTitle: 'content.list.emptyTitle',
  EmptyDescription: 'content.list.emptyDescription',
  Name: 'content.column.name',
  Kind: 'content.column.kind',
  Level: 'content.column.level',
  Traits: 'content.column.traits',
  Source: 'content.column.source',
} as const;

/** Placeholder rows while the entries load. */
const LOADING_ROWS = ['first', 'second', 'third', 'fourth'];

const rowIdOf = (row: BrowseRow): string => row.id;

/**
 * The public content browser (content-model.md, "Filters"): pick the kinds to list, narrow them with each kind's
 * facets, and read the entries left in a table. The kinds and the filters are in the URL (`kind`, `f.<facet>`), so a
 * filtered list is a link and back and forward restore it. The entries come from the cached mechanics bundles, so
 * filtering is instant and works offline.
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
    FilterChips,
    Page,
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
  readonly #router = inject(Router);
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
  protected readonly state: Signal<FilterState> = computed(() => filterFromQuery(this.#params(), this.#facets()));

  protected readonly registry = injectBrowseRegistry(() => this.kinds());
  readonly #entries: Signal<readonly ContentEntry[] | undefined> = computed(() => {
    const registry = this.registry.data();
    return registry === undefined ? undefined : entriesOf(registry, this.kinds());
  });

  protected readonly list: Signal<BrowseList | undefined> = computed(() => {
    const entries = this.#entries();
    if (entries === undefined) {
      return undefined;
    }
    return browseList({ entries, facets: this.#facets(), state: this.state() }, (left, right) =>
      this.#format.compare(left, right),
    );
  });

  readonly #limit = signal(PAGE_SIZE);
  protected readonly rows: Signal<readonly BrowseRow[]> = computed(() => {
    this.#messages();
    return (this.list()?.entries ?? []).slice(0, this.#limit()).map((entry) => this.#rowOf(entry));
  });
  protected readonly total = computed(() => this.list()?.entries.length ?? 0);
  protected readonly hasMore = computed(() => this.rows().length < this.total());

  protected readonly columns: Signal<readonly TableColumn<BrowseRow>[]> = computed(() => {
    this.#messages();
    const say = (key: string): string => this.#i18n.translate(key);
    return new RulesTableSchema<BrowseRow>()
      .addEntryName({
        id: BrowseColumn.Name,
        header: say(BrowseMessage.Name),
        value: (row) => row.name,
        to: (row) => row.to,
      })
      .addText({ id: BrowseColumn.Kind, header: say(BrowseMessage.Kind), value: (row) => row.kind })
      .addText({ id: BrowseColumn.Level, header: say(BrowseMessage.Level), value: (row) => row.level, sortable: false })
      .addTraits({ id: BrowseColumn.Traits, header: say(BrowseMessage.Traits), value: (row) => row.traits })
      .addSource({ id: BrowseColumn.Source, header: say(BrowseMessage.Source), value: (row) => row.sources })
      .build();
  });
  protected readonly rowId = rowIdOf;

  protected async pickKinds(picked: ReadonlySet<BrowseKind>): Promise<void> {
    const kinds = BROWSE_KINDS.filter((kind) => picked.has(kind));
    await this.#write(kinds, this.state());
  }

  protected async filter(state: FilterState): Promise<void> {
    await this.#write(this.kinds(), state);
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

  /** A new list or new filters are a new history entry, so back and forward restore the last one. */
  async #write(kinds: readonly BrowseKind[], state: FilterState): Promise<void> {
    this.#limit.set(PAGE_SIZE);
    await this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: {
        ...CLEARED,
        [KIND_PARAM]: kinds.length === 0 ? undefined : kindsToQuery(kinds),
        ...filterToQuery(state, facetsOf(kinds)),
      },
      queryParamsHandling: 'merge',
    });
  }
}
