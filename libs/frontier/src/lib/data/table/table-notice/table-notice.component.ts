import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { Button } from '../../../actions/button/button.component';
import { Alert } from '../../../feedback/alert/alert.component';
import { EmptyStateTitle } from '../../../feedback/empty-state/empty-state-title.component';
import { EmptyState } from '../../../feedback/empty-state/empty-state.component';
import { Stack } from '../../../layout/stack/stack.component';

/** The empty state's title, by whether a filter is active. */
const EMPTY_TITLE = { filtered: 'frontier.async.noMatches', plain: 'frontier.async.empty' } as const;

/**
 * What a table with no rows to show says, inside one cell across every column: an inline error with *Retry* when the
 * load `failed`, otherwise an empty state, which offers *Clear filters* when a filter `filtered` the rows away.
 */
@Component({
  selector: 'fr-table-notice',
  imports: [Alert, Button, EmptyState, EmptyStateTitle, Stack, TranslocoPipe],
  templateUrl: './table-notice.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class TableNotice {
  public readonly failed = input(false, { transform: booleanAttribute });
  public readonly filtered = input(false, { transform: booleanAttribute });
  /** The user pressed *Retry*. */
  public readonly retry = output();
  /** The user pressed *Clear filters*. */
  public readonly cleared = output();

  protected readonly emptyTitle = computed(() => (this.filtered() ? EMPTY_TITLE.filtered : EMPTY_TITLE.plain));
}
