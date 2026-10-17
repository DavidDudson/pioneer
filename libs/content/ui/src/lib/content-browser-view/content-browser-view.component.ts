import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncData, AsyncPending, AsyncRegion, Button, HeadingLevel, Skeleton, Stack } from '@pioneer/frontier';
import type { AsyncQuery, FilterField, SelectOption } from '@pioneer/frontier';
import type { TableColumn, TableViewSort } from '@pioneer/frontier/data';
import type { ContentKind, FilterState } from '@pioneer/rules/sdk';

import type { BrowseRow } from '../browse-row';
import { BrowserFilters } from '../browser-filters/browser-filters.component';
import type { ContentBrowserEntry, ContentBrowserList } from '../browser-list';
import { BrowserRows } from '../browser-rows/browser-rows.component';
import { BrowserSearch } from '../browser-search/browser-search.component';
import { ContentBrowserTier } from '../browser-state';
import type { ContentBrowserState, ContentEntryRef } from '../browser-state';
import { ContentEntryView } from '../entry-view/content-entry-view.component';
import { tierRegions } from '../tier-regions';
import type { TierRegions } from '../tier-regions';

const ViewMessage = {
  Back: 'contentBrowser.entry.back',
  LoadError: 'contentBrowser.list.loadError',
  SearchError: 'contentBrowser.list.searchError',
  EntryError: 'contentBrowser.entry.loadError',
} as const;

/** Placeholder rows while the entries load. */
const LOADING_ROWS = ['first', 'second', 'third', 'fourth'];

/**
 * The content browser at one tier (#955). The entry view, the list and the state are the same at every tier; the tier
 * picks the regions and their density: `page` the search, the kinds, both filters and the table with its column
 * chooser, `panel` the search, the kinds, the filter bar and a compact list that opens an entry in place, `preview`
 * the picked entry alone. It draws what it is given and writes every change to `state`, so a container that loads the
 * content, or a host that only holds the value, drives all three the same way.
 */
@Component({
  selector: 'pio-content-browser-view',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    BrowserFilters,
    BrowserRows,
    BrowserSearch,
    Button,
    ContentEntryView,
    Skeleton,
    Stack,
    TranslocoPipe,
  ],
  templateUrl: './content-browser-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentBrowserView {
  public readonly tier = input.required<ContentBrowserTier>();
  public readonly state = model.required<ContentBrowserState>();
  public readonly kindOptions = input.required<readonly SelectOption<ContentKind>[]>();
  /** What the filter bar offers. */
  public readonly fields = input.required<readonly FilterField[]>();
  /** What the filters mean for the list's facets. */
  public readonly facetState = input.required<FilterState>();
  public readonly list = input.required<AsyncQuery<ContentBrowserList>>();
  public readonly entry = input.required<AsyncQuery<ContentBrowserEntry>>();
  public readonly columns = input.required<readonly TableColumn<BrowseRow>[]>();
  /** The table's sort and hidden columns, which only the page tier has. */
  public readonly sorting = model<readonly TableViewSort[]>([]);
  public readonly hidden = model<readonly string[] | undefined>(undefined);
  /** The facet panel changed a filter. */
  public readonly facetChange = output<FilterState>();
  /** "Show more" was pressed. */
  public readonly more = output();

  protected readonly Message = ViewMessage;
  protected readonly loadingRows = LOADING_ROWS;
  protected readonly regions: Signal<TierRegions> = computed(() => tierRegions(this.tier()));
  /** The entry shows when one is picked, and always where there is no list to fall back to. */
  protected readonly showEntry = computed(
    () => this.regions().entry && (this.state().selected !== undefined || !this.regions().list),
  );
  protected readonly headingLevel = computed(() =>
    this.tier() === ContentBrowserTier.Page ? HeadingLevel.Two : HeadingLevel.Three,
  );
  protected readonly full = computed(() => this.tier() !== ContentBrowserTier.Preview);

  /** Words in the search change what a failure means: the server does the matching, so it needs a connection. */
  protected readonly listError = computed(() =>
    this.state().query.trim() === '' ? ViewMessage.LoadError : ViewMessage.SearchError,
  );

  protected back(): void {
    this.state.update((state) => ({ ...state, selected: undefined }));
  }

  protected pick(selected: ContentEntryRef): void {
    this.state.update((state) => ({ ...state, selected }));
  }
}
