import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Button } from '../../actions/button/button.component';
import { AsyncStatus } from '../../async/async-action';
import { AsyncIndicator } from '../../async/async-indicator/async-indicator.component';
import type { InlineEdit } from '../inline-edit';
import { InlineEditStatus } from '../inline-edit';

/** Spinner while saving, "Saved ✓" once saved, and Revert while the revert window is open. */
@Component({
  selector: 'fr-save-status',
  imports: [AsyncIndicator, Button],
  templateUrl: './save-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex shrink-0 items-center gap-xs' },
})
export class SaveStatus<TValue> {
  public readonly label = input.required<string>();
  public readonly edit = input.required<InlineEdit<TValue>>();

  /** The save's own state; errors and conflicts are shown by the field as a message. */
  protected readonly indicatorStatus = computed<AsyncStatus>(() => {
    const status = this.edit().status();
    if (status === InlineEditStatus.Pending) {
      return AsyncStatus.Pending;
    }
    return status === InlineEditStatus.Success ? AsyncStatus.Success : AsyncStatus.Idle;
  });
}
