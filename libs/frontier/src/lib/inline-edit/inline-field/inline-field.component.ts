import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Button } from '../../actions/button/button.component';
import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { Spinner } from '../../feedback/spinner/spinner.component';
import { Stack } from '../../layout/stack/stack.component';
import { Text } from '../../text/text.directive';
import { Tone } from '../../tokens';
import type { InlineEdit } from '../inline-edit';
import { InlineEditStatus } from '../inline-edit';

const EDITING_STATES = new Set<InlineEditStatus>([
  InlineEditStatus.Editing,
  InlineEditStatus.Saving,
  InlineEditStatus.Failed,
  InlineEditStatus.Conflict,
]);

const SAVED_HINT = { text: 'Saved ✓', tone: Tone.Success, role: 'status', classes: '' } as const;
const EDIT_HINT = {
  text: 'Edit',
  tone: Tone.Subtle,
  role: undefined,
  classes: 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
} as const;

/**
 * Chrome for one inline-editable value: label, read view, per-field skeleton,
 * spinner, saved tick, error/conflict message. The editor control is
 * projected and only rendered while editing:
 *
 * ```html
 * <fr-inline-field label="Name" [edit]="name">
 *   <fr-text-input frInlineEditor label="Name" hideLabel [(value)]="name.draft" (committed)="name.commit()" (cancelled)="name.cancel()" />
 * </fr-inline-field>
 * ```
 */
@Component({
  selector: 'fr-inline-field',
  imports: [Button, Skeleton, Spinner, Stack, Text],
  templateUrl: './inline-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '[attr.aria-busy]': 'edit().busy() || null' },
})
export class InlineField<TValue> {
  public readonly label = input.required<string>();
  public readonly edit = input.required<InlineEdit<TValue>>();

  protected readonly Status = InlineEditStatus;
  protected readonly status = computed(() => this.edit().status());
  protected readonly editing = computed(() => EDITING_STATES.has(this.status()));
  protected readonly saving = computed(() => this.status() === InlineEditStatus.Saving);
  protected readonly invalid = computed(() => this.edit().validationError() !== undefined);
  protected readonly message = computed(() => this.edit().validationError() ?? this.edit().error());
  protected readonly messageTone = computed(() =>
    this.status() === InlineEditStatus.Conflict && this.edit().validationError() === undefined
      ? Tone.Warning
      : Tone.Danger,
  );
  protected readonly hint = computed(() => (this.status() === InlineEditStatus.Saved ? SAVED_HINT : EDIT_HINT));
}
