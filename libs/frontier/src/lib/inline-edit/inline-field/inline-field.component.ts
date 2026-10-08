import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { Stack } from '../../layout/stack/stack.component';
import { Text } from '../../text/text.directive';
import { Tone } from '../../tokens';
import type { InlineEdit } from '../inline-edit';
import { InlineEditStatus } from '../inline-edit';
import { SaveStatus } from '../save-status/save-status.component';

const FOCUSABLE = 'input, select, textarea, button, [tabindex]:not([tabindex="-1"])';

/**
 * Chrome for one inline-editable value: label, read view, per-field skeleton,
 * spinner, saved tick, Revert, error/conflict message. No save or cancel
 * buttons: the value saves itself (see `InlineEdit`). The editor control is
 * projected, focused when opened, and only rendered while open:
 *
 * ```html
 * <fr-inline-field label="Name" [edit]="name">
 *   <fr-text-input frInlineEditor label="Name" hideLabel [value]="name.draft()" (valueChange)="name.change($event)"
 *     (committed)="name.flushSoon()" (cancelled)="name.cancel()" />
 * </fr-inline-field>
 * ```
 */
@Component({
  selector: 'fr-inline-field',
  imports: [SaveStatus, Skeleton, Stack, Text],
  templateUrl: './inline-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '[attr.aria-busy]': 'edit().busy() || null' },
})
export class InlineField<TValue> {
  public readonly label = input.required<string>();
  public readonly edit = input.required<InlineEdit<TValue>>();

  protected readonly Status = InlineEditStatus;
  protected readonly status = computed(() => this.edit().status());
  protected readonly message = computed(() => this.edit().validationError() ?? this.edit().error());
  protected readonly messageTone = computed(() =>
    this.status() === InlineEditStatus.Conflict && this.edit().validationError() === undefined
      ? Tone.Warning
      : Tone.Danger,
  );

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly editor = viewChild<ElementRef<HTMLElement>>('editor');

  public constructor() {
    afterRenderEffect(() => {
      const editor = this.editor()?.nativeElement;
      if (editor !== undefined && !editor.contains(document.activeElement)) {
        editor.querySelector<HTMLElement>(FOCUSABLE)?.focus();
      }
    });
  }

  /** Close only when focus leaves the whole field (not when it moves to Revert or a listbox). */
  protected focusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !this.#host.nativeElement.contains(next)) {
      this.edit().close();
    }
  }
}
