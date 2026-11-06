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
import { TranslocoPipe } from '@jsverse/transloco';

import { Button } from '../../actions/button/button.component';
import { Message, MessageTone } from '../../feedback/message/message.component';
import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { uniqueId } from '../../ids';
import { Stack } from '../../layout/stack/stack.component';
import { Text } from '../../text/text/text.component';
import type { InlineEdit } from '../inline-edit';
import { InlineEditStatus } from '../inline-edit';
import { SaveStatus } from '../save-status/save-status.component';

const FOCUSABLE = 'input, select, textarea, button, [tabindex]:not([tabindex="-1"])';
/** Marks where focus goes when an editor has controls ahead of the one to type in (a filter panel above a picker). */
const AUTOFOCUS = '[data-autofocus]';

/**
 * Chrome for one inline-editable value: label, read view, per-field skeleton,
 * spinner, saved tick, Revert, error/conflict message. No save or cancel
 * buttons: the value saves itself (see `InlineEdit`). The editor control is
 * projected, focused when opened, and only rendered while open. It is focused at its first control, or at the first
 * control inside an element marked `data-autofocus` when other controls come ahead of the one to type in:
 *
 * ```html
 * <fr-inline-field label="Name" [edit]="name">
 *   <fr-text-input frInlineEditor ariaLabel="Name" [value]="name.draft()" (valueChange)="name.change($event)"
 *     (committed)="name.flushSoon()" (cancelled)="name.cancel()" />
 * </fr-inline-field>
 * ```
 */
@Component({
  selector: 'fr-inline-field',
  imports: [Button, Message, SaveStatus, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './inline-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '[attr.aria-busy]': 'edit().busy() || null' },
})
export class InlineField<TValue> {
  public readonly label = input.required<string>();
  public readonly edit = input.required<InlineEdit<TValue>>();
  /** A warning about the value as it stands (a pick that counts for nothing), shown under it and read with it. */
  public readonly notice = input<string | undefined>(undefined);

  protected readonly noticeId = uniqueId('fr-inline-notice');

  protected readonly Status = InlineEditStatus;
  protected readonly status = computed(() => this.edit().status());
  protected readonly message = computed(() => this.edit().validationError() ?? this.edit().error());
  protected readonly messageTone = computed(() =>
    this.status() === InlineEditStatus.Conflict && this.edit().validationError() === undefined
      ? MessageTone.Warning
      : MessageTone.Danger,
  );

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly editor = viewChild<string, ElementRef<HTMLElement>>('editor', { read: ElementRef });

  public constructor() {
    afterRenderEffect(() => {
      const editor = this.editor()?.nativeElement;
      if (editor !== undefined && !editor.contains(document.activeElement)) {
        const start = editor.querySelector<HTMLElement>(AUTOFOCUS) ?? editor;
        start.querySelector<HTMLElement>(FOCUSABLE)?.focus();
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
