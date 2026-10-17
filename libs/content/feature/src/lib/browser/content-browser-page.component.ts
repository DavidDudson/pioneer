import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import type { Params } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ContentBrowserTier } from '@pioneer/content/ui';
import type { ContentBrowserState } from '@pioneer/content/ui';
import { Page, PageBody, PageHeader } from '@pioneer/frontier';
import { injectTableView, tableViewColumns } from '@pioneer/frontier/data';
import type { TableViewSchema } from '@pioneer/frontier/data';
import { filterParamName } from '@pioneer/rules/sdk';
import type { QueryParams } from '@pioneer/rules/sdk';

import { ALL_FACETS, BROWSE_KINDS, facetsOf, KIND_PARAM, kindsFromQuery, kindsToQuery } from './browse-kinds';
import { injectBrowseColumns } from './browse-messages';
import { searchFromQuery } from './browse-search';
import { listedKinds } from './browse-state';
import { ContentBrowser } from './content-browser.component';
import { facetTextCodec } from './facet-text';

const NO_PARAMS: QueryParams = {};

/** Every facet's query param cleared, so a facet the new list drops leaves the URL. */
const CLEARED: Readonly<Record<string, undefined>> = Object.fromEntries(
  ALL_FACETS.map((facet) => [filterParamName(facet.id), undefined]),
);

const BrowseMessage = {
  Title: 'content.page.title',
  Description: 'content.page.description',
} as const;

/**
 * The public content browser (content-model.md, "Filters") at `/content`: the browser at its page tier, with its state
 * kept in the URL. The kinds, the words and the filters are in the link (`kind`, and the table view's `q`, `f`, `s`,
 * `c`; ADR-0068), so a filtered list is a link and back and forward restore it. The browser itself, and so what is
 * loaded and how, is the same as at the other tiers.
 */
@Component({
  selector: 'pio-content-browser-page',
  imports: [ContentBrowser, Page, PageBody, PageHeader, TranslocoPipe],
  templateUrl: './content-browser-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentBrowserPage {
  readonly #params = toSignal(inject(ActivatedRoute).queryParams, { initialValue: NO_PARAMS });

  protected readonly Message = BrowseMessage;
  protected readonly tier = ContentBrowserTier.Page;

  readonly #kinds = computed(() => kindsFromQuery(this.#params()[KIND_PARAM]));
  readonly #codec = facetTextCodec(() => facetsOf(this.#kinds()));
  readonly #columns = injectBrowseColumns(() => this.#kinds());
  /**
   * The table's view in the URL: sort (`s`), filters (`f`), hidden columns (`c`) and words (`q`). The kinds stay the
   * page's own param.
   */
  protected readonly view = injectTableView({
    schema: (): TableViewSchema => ({ columns: tableViewColumns(this.#columns()) }),
    facets: this.#codec,
  });

  /** What the link holds, as the browser's state. */
  protected readonly state: Signal<ContentBrowserState> = computed(() => ({
    kinds: this.#kinds(),
    query: this.view.search(),
    filters: this.view.filters(),
  }));

  /**
   * A new list, new filters or new words are a new history entry, so back and forward restore the last one. The filters
   * the new kinds still have stay, the others leave the link, and so do params from before the table view
   * (`f.<facet>`).
   */
  protected async write(next: ContentBrowserState): Promise<void> {
    const kinds = BROWSE_KINDS.filter((kind) => next.kinds.includes(kind));
    const facets = facetTextCodec(() => facetsOf(listedKinds(kinds))).encode(next.filters);
    const params: Params = { ...CLEARED, [KIND_PARAM]: kinds.length === 0 ? undefined : kindsToQuery(kinds) };
    await this.view.apply({ facets, search: searchFromQuery(next.query) ?? '' }, { params });
  }
}
