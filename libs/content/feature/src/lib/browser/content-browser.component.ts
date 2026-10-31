import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
} from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { ContentBrowserView, EMPTY_BROWSER_STATE } from '@pioneer/content/ui';
import type {
  BrowseCreature,
  BrowseRow,
  ContentBrowserEntry,
  ContentBrowserList,
  ContentBrowserState,
  ContentBrowserTier,
} from '@pioneer/content/ui';
import { LocaleFormat } from '@pioneer/frontier';
import type { AsyncQuery, SelectOption } from '@pioneer/frontier';
import type { TableViewSort } from '@pioneer/frontier/data';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentLicense, CreatureData, FilterState, PackId } from '@pioneer/rules/sdk';
import { ENTRY_PREVIEWS, entryTarget, RARITY_TONES, RICH_TEXT_LINKS, SIZE_MESSAGES } from '@pioneer/rules/ui';
import type { Chip, EntryPreview, EntryPreviews, RichTextLinks } from '@pioneer/rules/ui';

import { injectEntryDescription } from '../entry/entry-description';
import { entryCard, entryIndex, entryLinks, entryPreviews, findEntry } from '../entry/entry-lookup';
import { ROLE_MESSAGES, SIZE_ORDER } from './browse-creature';
import { BROWSE_KINDS, facetsOf, isBrowseKind, KIND_MESSAGES } from './browse-kinds';
import type { BrowseKind } from './browse-kinds';
import { isLegacyEntry, packLicenses } from './browse-legacy';
import { browseList, entriesOf } from './browse-list';
import type { BrowseList } from './browse-list';
import { injectBrowseColumns, injectMessagesChanged } from './browse-messages';
import { injectBrowseRegistry } from './browse-registry';
import { injectBrowseSearch, searchFromQuery } from './browse-search';
import type { BrowseSearch } from './browse-search';
import { kindsToLoad, listedKinds, refOf, withKnownFilters } from './browse-state';
import { filterConditions, filterFields, filterState } from './filter-bar-state';

/** How many entries the list shows at first and each time "Show more" is pressed. */
const PAGE_SIZE = 100;

/** The licences before any pack has loaded. */
const NO_LICENSES: ReadonlyMap<PackId, ContentLicense> = new Map();

/**
 * The content browser (#955), embeddable at three tiers (`preview`, `panel`, `page`) over one `state`. It loads the
 * kinds the state needs from the cached mechanics bundles (names, filters and descriptions come from the same
 * bundles at every tier), derives the list and the picked entry, and hands them to `pio-content-browser-view`, which
 * only draws them and writes every change back to `state`. The page tier's host keeps the state in the URL.
 */
@Component({
  selector: 'pio-content-browser',
  imports: [ContentBrowserView],
  templateUrl: './content-browser.component.html',
  providers: [
    { provide: RICH_TEXT_LINKS, useFactory: (): RichTextLinks => inject(ContentBrowser).links },
    { provide: ENTRY_PREVIEWS, useFactory: (): EntryPreviews => inject(ContentBrowser).previews },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentBrowser {
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #changed = injectMessagesChanged();

  public readonly tier = input.required<ContentBrowserTier>();
  /**
   * Everything the browser is showing. The container reads it and writes every change back. Until a host gives one it
   * shows the default list and loads nothing: a host sets its inputs after the container is made.
   */
  public readonly state = input<ContentBrowserState | undefined>(undefined);
  /** The state after a change made in the browser. A host that holds the value sets it back. */
  public readonly stateChange = output<ContentBrowserState>();
  /** The table's sort and hidden columns, which only the page tier has. */
  public readonly sorting = model<readonly TableViewSort[]>([]);
  public readonly hidden = model<readonly string[] | undefined>(undefined);

  /** The host's state, or what the browser last wrote if the host has not set it back yet. */
  readonly #written = linkedSignal<ContentBrowserState | undefined>(() => this.state());
  readonly #current = computed(() => this.#written() ?? EMPTY_BROWSER_STATE);
  readonly #kinds: Signal<readonly BrowseKind[]> = computed(() => listedKinds(this.#current().kinds));
  readonly #facets = computed(() => facetsOf(this.#kinds()));

  protected readonly kindOptions: Signal<readonly SelectOption<BrowseKind>[]> = computed(() => {
    this.#changed();
    return BROWSE_KINDS.map((kind) => ({ value: kind, label: this.#i18n.translate(KIND_MESSAGES[kind]) }));
  });
  /** The kinds the state is listing, which the chips show picked; a state naming none lists the default. */
  protected readonly shownState: Signal<ContentBrowserState> = computed(() => ({
    ...this.#current(),
    kinds: this.#kinds(),
  }));

  protected readonly registry = injectBrowseRegistry(() =>
    this.#written() === undefined ? undefined : kindsToLoad(this.#current()),
  );
  readonly #entries: Signal<readonly ContentEntry[] | undefined> = computed(() => {
    const registry = this.registry.data();
    return registry === undefined ? undefined : entriesOf(registry, this.#kinds());
  });

  /** The licence of each pack loaded, which says which entries are legacy. */
  readonly #licenses = computed(() => {
    const registry = this.registry.data();
    return registry === undefined ? NO_LICENSES : packLicenses(registry);
  });

  readonly #words = computed(() => searchFromQuery(this.#current().query));
  readonly #criteria: Signal<BrowseSearch | undefined> = computed(() => {
    const words = this.#words();
    return words === undefined ? undefined : { words, kinds: this.#kinds() };
  });
  readonly #search = injectBrowseSearch(() => this.#criteria());

  protected readonly facetState: Signal<FilterState> = computed(() =>
    filterState(this.#current().filters, this.#facets()),
  );
  readonly #list: Signal<BrowseList | undefined> = computed(() => {
    const entries = this.#entries();
    const searching = this.#words() !== undefined;
    const matches = searching ? this.#search.data() : undefined;
    if (entries === undefined || (searching && matches === undefined)) {
      return undefined;
    }
    return browseList({ entries, facets: this.#facets(), state: this.facetState(), matches }, (left, right) =>
      this.#format.compare(left, right),
    );
  });

  readonly #limit = signal(PAGE_SIZE);
  protected readonly columns = injectBrowseColumns(() => this.#kinds());

  readonly #shown: Signal<ContentBrowserList | undefined> = computed(() => {
    this.#changed();
    const list = this.#list();
    return list === undefined
      ? undefined
      : {
          rows: list.entries.slice(0, this.#limit()).map((entry) => this.#rowOf(entry)),
          total: list.entries.length,
          counts: list.counts,
          searching: this.#words() !== undefined,
        };
  });

  /** The list once the bundles and, while searching, the matches have loaded. */
  protected readonly browse: AsyncQuery<ContentBrowserList> = {
    data: computed(() => this.#shown()),
    error: computed(() => (this.registry.isError() ? this.registry.error() : this.#search.error())),
    isPending: () => this.registry.isPending() || (this.#words() !== undefined && this.#search.isPending()),
    isError: () => this.registry.isError() || (this.#words() !== undefined && this.#search.isError()),
  };

  /** What the filter bar offers: a field per facet of the list, labelled in the UI language. */
  protected readonly fields = computed(() => {
    this.#changed();
    return filterFields(this.#list()?.counts ?? [], (key) => this.#i18n.translate(key));
  });

  readonly #index = computed(() => {
    const registry = this.registry.data();
    return registry === undefined ? undefined : entryIndex(registry);
  });
  /** A reference in a description is named and linked from the entries loaded. */
  public readonly links: RichTextLinks = entryLinks(() => this.#index());
  /** What a name in the table previews on hover and focus: the entries the list was built from. */
  public readonly previews: EntryPreviews = entryPreviews(() => this.#index());

  /** The entry the state picks, or `undefined` once the registry is loaded without it. */
  readonly #picked: Signal<ContentEntry | undefined> = computed(() => {
    const { selected } = this.#current();
    const registry = this.registry.data();
    return selected === undefined || registry === undefined
      ? undefined
      : findEntry(registry, selected.kind, selected.name);
  });
  readonly #description = injectEntryDescription(() => this.#picked());
  readonly #card: Signal<EntryPreview | undefined> = computed(() => {
    const entry = this.#picked();
    return entry === undefined ? undefined : entryCard(entry, this.#description.data());
  });
  protected readonly entry: AsyncQuery<ContentBrowserEntry> = {
    data: computed(() => (this.registry.data() === undefined ? undefined : { card: this.#card() })),
    error: this.registry.error,
    isPending: () => this.registry.isPending(),
    isError: () => this.registry.isError(),
  };

  /** Any change to the state starts the list over at its first page and drops filters its kinds no longer have. */
  protected write(next: ContentBrowserState): void {
    this.#limit.set(PAGE_SIZE);
    const written = withKnownFilters(next);
    this.#written.set(written);
    this.stateChange.emit(written);
  }

  protected facet(state: FilterState): void {
    this.write({ ...this.#current(), filters: filterConditions(state) });
  }

  protected more(): void {
    this.#limit.update((limit) => limit + PAGE_SIZE);
  }

  #rowOf(entry: ContentEntry): BrowseRow {
    const tone = RARITY_TONES[entry.rarity];
    const traits = entry.traits.map((trait): Chip => ({ label: trait, tone }));
    return {
      id: entry.id,
      entry: entry.id,
      name: entry.name,
      to: entryTarget(entry),
      ref: refOf(entry),
      kind: isBrowseKind(entry.kind) ? this.#i18n.translate(KIND_MESSAGES[entry.kind]) : '',
      level: this.#levelText(entry),
      levelValue: 'level' in entry && typeof entry.level === 'number' ? entry.level : undefined,
      creature: entry.kind === ContentKind.Creature ? this.#creatureOf(entry.data) : undefined,
      traits,
      sources: entry.sources,
      legacy: isLegacyEntry(entry, this.#licenses()),
    };
  }

  /** The creature's role and size in the UI language, and its Hit Points and Armor Class. */
  #creatureOf({ role, size, hitPoints, armorClass }: CreatureData): BrowseCreature {
    return {
      role: this.#i18n.translate(ROLE_MESSAGES[role]),
      size: this.#i18n.translate(SIZE_MESSAGES[size]),
      sizeOrder: SIZE_ORDER.indexOf(size),
      hitPoints,
      armorClass,
    };
  }

  /** A kit has no level, so it is read where an entry has one. */
  #levelText(entry: ContentEntry): string {
    return 'level' in entry && typeof entry.level === 'number' ? this.#format.number(entry.level) : '';
  }
}
