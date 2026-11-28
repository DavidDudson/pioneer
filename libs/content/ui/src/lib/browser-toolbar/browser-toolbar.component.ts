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

/** The strip above the browser's list: search, filters and the entry count. */
@Component({
  selector: 'pio-browser-toolbar',
  imports: [BrowserFilters, BrowserSearch, TableToolbar, Text, ToolbarFilters, TranslocoPipe],
  templateUrl: './browser-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrowserToolbar {
  public readonly state = model.required<ContentBrowserState>();
  public readonly kindOptions = input.required<ReadonlyArray<SelectOption<ContentKind>>>();
  public readonly fields = input.required<ReadonlyArray<FilterField>>();
  public readonly facetState = input.required<FilterState>();
  public readonly facets = input.required<boolean>();
  /** The loaded list, or `undefined` while there is none to filter or count. */
  public readonly list = input.required<ContentBrowserList | undefined>();
  public readonly facetChange = output<FilterState>();

  protected readonly Message = ToolbarMessage;
}
