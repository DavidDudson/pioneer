import { ChangeDetectionStrategy, Component, computed, contentChild, input, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { ToggleButton } from '../../controls/toggle-button/toggle-button.component';
import { Box } from '../box/box.component';
import { Stack } from '../stack/stack.component';
import { ToolbarFilters } from './toolbar-filters.directive';
import { ToolbarView } from './toolbar-view.directive';

/**
 * The strip above a table or list: search, filters, view options and the result count. Layout only; it owns every
 * gap, so a page places it directly above the table. Slots: `[frToolbarSearch]`, `[frToolbarFilters]` (with the
 * `ToolbarFilters` directive), `[frToolbarView]` (with `ToolbarView`) and `[frToolbarCount]`, a polite live region.
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

  /** The count's gap to the row shows only while a count is projected. */
  protected readonly liveClasses = 'not-empty:pt-sm';

  protected readonly filtersOpen = signal(false);
  protected readonly viewOpen = signal(false);
  protected readonly filters = contentChild(ToolbarFilters);
  protected readonly view = contentChild(ToolbarView);
  protected readonly hasFilters = computed(() => this.filters() !== undefined);
  protected readonly hasView = computed(() => this.view() !== undefined);
  protected readonly hasButtons = computed(() => this.hasFilters() || this.hasView());
}
