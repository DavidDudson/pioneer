import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { TableToolbar, Text, ToolbarFilters } from '@pioneer/frontier';
import type { FilterField, SelectOption } from '@pioneer/frontier';
import type { ContentKind, FilterState } from '@pioneer/rules/sdk';

import { BrowserFilters } from '../browser-filters/browser-filters.component';
import type { ContentBrowserList } from '../browser-list';
import { BrowserSearch } from '../browser-search/browser-search.component';
import type { ContentBrowserState } from '../browser-state';

const ToolbarMessage = {
  Count: 'contentBrowser.list.count',
  Label: 'contentBrowser.search.label',
} as const;

/**
 * The strip above the browser's list: the words and kinds, the filters and how many entries the filters leave. The
 * filters and the count come with the list, so they show once it has loaded.
 */
@Component({
  selector: 'pio-browser-toolbar',
  imports: [BrowserFilters, BrowserSearch, TableToolbar, Text, ToolbarFilters, TranslocoPipe],
  templateUrl: './browser-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrowserToolbar {
  public readonly state = model.required<ContentBrowserState>();
  public readonly kindOptions = input.required<readonly SelectOption<ContentKind>[]>();
  /** What the filter bar offers. */
  public readonly fields = input.required<readonly FilterField[]>();
  /** What the filters mean for the list's facets. */
  public readonly facetState = input.required<FilterState>();
  /** Shows the facet panel under the filter bar. */
  public readonly facets = input.required<boolean>();
  /** The loaded list, or `undefined` while there is none to filter or count. */
  public readonly list = input.required<ContentBrowserList | undefined>();
  /** The facet panel changed a filter. */
  public readonly facetChange = output<FilterState>();

  protected readonly Message = ToolbarMessage;
}
