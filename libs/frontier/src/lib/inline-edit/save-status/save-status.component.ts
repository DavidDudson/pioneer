import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Button } from '../../actions/button/button.component';
import { Spinner } from '../../feedback/spinner/spinner.component';
import { Text } from '../../text/text.directive';
import type { InlineEdit } from '../inline-edit';
import { InlineEditStatus } from '../inline-edit';

/** Spinner while saving, a tick once saved, and Revert while the revert window is open. */
@Component({
  selector: 'fr-save-status',
  imports: [Button, Spinner, Text],
  templateUrl: './save-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex shrink-0 items-center gap-xs' },
})
export class SaveStatus<TValue> {
  public readonly label = input.required<string>();
  public readonly edit = input.required<InlineEdit<TValue>>();

  protected readonly Status = InlineEditStatus;
  protected readonly status = computed(() => this.edit().status());
}
