import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FilterBar, Stack } from '@pioneer/frontier';
import type { FilterCondition, FilterField } from '@pioneer/frontier';
import type { FacetCounts, FilterState } from '@pioneer/rules/sdk';
import { FacetFilterView } from '@pioneer/rules/ui';

import type { ContentBrowserState } from '../browser-state';

/**
 * The filters over a list: the filter bar, and under it, when the tier has room, the facet panel. Both edit the same
 * filters, so the state holds one set and each shows it its own way.
 */
@Component({
  selector: 'pio-browser-filters',
  imports: [FacetFilterView, FilterBar, Stack],
  templateUrl: './browser-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrowserFilters {
  public readonly state = model.required<ContentBrowserState>();
  /** What the filter bar offers: a field per facet of the list. */
  public readonly fields = input.required<readonly FilterField[]>();
  public readonly counts = input.required<readonly FacetCounts[]>();
  /** What the filters mean for the list's facets, for the facet panel. */
  public readonly facetState = input.required<FilterState>();
  /** Shows the facet panel under the bar. */
  public readonly facets = input.required<boolean>();
  /** The facet panel changed a filter. The container turns it into conditions, as it knows the facets. */
  public readonly facetChange = output<FilterState>();

  protected filtered(filters: readonly FilterCondition[]): void {
    this.state.update((state) => ({ ...state, filters }));
  }
}
