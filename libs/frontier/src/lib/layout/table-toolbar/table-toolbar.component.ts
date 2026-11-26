import { ChangeDetectionStrategy, Component, computed, contentChild, input, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { ToggleButton } from '../../controls/toggle-button/toggle-button.component';
import { Box } from '../box/box.component';
import { Stack } from '../stack/stack.component';
import { ToolbarFilters } from './toolbar-filters.directive';
import { ToolbarView } from './toolbar-view.directive';

/**
 * The strip above a table or list: search, filters, view options and the result count. It is layout only and
 * owns every gap, inside it and down to what follows it, so a page places it directly above the table.
 * One row from the `md` container size; below it the search stays on its own row and the filters and view
 * content hide behind Filters and Columns buttons that open them in place.
 *
 * Slots: `[frToolbarSearch]`, `[frToolbarFilters]` and `[frToolbarView]` (the last two carry their directive,
 * `ToolbarFilters` and `ToolbarView`) and `[frToolbarCount]`, a polite live region that announces the number
 * of results as it changes. Give `label` to make the toolbar a labelled `search` landmark.
 *
 * ```html
 * <fr-table-toolbar [label]="'spells.search' | transloco">
 *   <fr-search-input frToolbarSearch … />
 *   <fr-filter-chips frToolbarFilters … />
 *   <fr-text frToolbarCount>{{ 'spells.count' | transloco: { total } }}</fr-text>
 * </fr-table-toolbar>
 * ```
 */
@Component({
  selector: 'fr-table-toolbar',
  imports: [Box, Stack, ToggleButton, TranslocoPipe],
  templateUrl: './table-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block pb-md',
    '[attr.role]': 'label() === undefined ? null : "search"',
    '[attr.aria-label]': 'label() ?? null',
  },
})
export class TableToolbar {
  /** Names the toolbar as a `search` landmark. */
  public readonly label = input<string | undefined>(undefined);

  protected readonly filtersOpen = signal(false);
  protected readonly viewOpen = signal(false);
  protected readonly filters = contentChild(ToolbarFilters);
  protected readonly view = contentChild(ToolbarView);
  protected readonly hasFilters = computed(() => this.filters() !== undefined);
  protected readonly hasView = computed(() => this.view() !== undefined);
  protected readonly hasButtons = computed(() => this.hasFilters() || this.hasView());
}
