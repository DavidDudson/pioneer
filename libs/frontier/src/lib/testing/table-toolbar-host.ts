import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TableToolbar } from '../layout/table-toolbar/table-toolbar.component';
import { ToolbarFilters } from '../layout/table-toolbar/toolbar-filters.directive';
import { ToolbarView } from '../layout/table-toolbar/toolbar-view.directive';

/** What each `TableToolbarHost` slot shows, so a spec can find the slot by its text. */
const TOOLBAR_HOST_SLOTS = { search: 'Search', filters: 'Filter content', view: 'View content' } as const;

/** `fr-table-toolbar` filled the way a feature fills it: search, optional filters and view, and a count. */
@Component({
  selector: 'fr-table-toolbar-host',
  imports: [TableToolbar, ToolbarFilters, ToolbarView],
  templateUrl: './table-toolbar-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableToolbarHost {
  public readonly count = input('3 results');
  public readonly withFilters = input(true, { transform: booleanAttribute });
  public readonly withView = input(true, { transform: booleanAttribute });

  protected readonly label = 'Search spells';
  protected readonly slots = TOOLBAR_HOST_SLOTS;
}
