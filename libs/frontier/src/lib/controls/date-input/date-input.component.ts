import { ChangeDetectionStrategy, Component, computed, model, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { Temporal } from '@pioneer/shared/kernel';

import { injectCommitKeys } from '../commit-keys';
import { Control } from '../control';
import { controlVariants } from '../control.variants';

/** Plain calendar date control backed by `Temporal.PlainDate` (native picker). In a form use `fr-date-field`. */
@Component({
  selector: 'fr-date-input',
  templateUrl: './date-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class DateInput extends Control {
  public readonly value = model<Temporal.PlainDate | undefined>(undefined);

  protected readonly classes = controlVariants();
  protected readonly control = viewChild<ElementRef<HTMLInputElement>>('control');
  protected readonly iso = computed(() => this.value()?.toString() ?? '');

  public constructor() {
    super();
    injectCommitKeys(this.control, {
      commit: () => {
        this.committed.emit();
      },
      cancel: () => {
        this.cancelled.emit();
      },
    });
  }

  protected onInput(raw: string): void {
    this.value.set(raw === '' ? undefined : Temporal.PlainDate.from(raw));
  }
}
