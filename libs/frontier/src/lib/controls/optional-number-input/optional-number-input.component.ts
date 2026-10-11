import { ChangeDetectionStrategy, Component, input, model, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';

import { injectCommitKeys } from '../commit-keys';
import { Control } from '../control';
import { controlVariants } from '../control.variants';

/**
 * Plain integer control that may be left empty: `value` is undefined while the box is empty, as for an open bound
 * of a range ("any level"). Mid-edit text that isn't a whole number (`-`, `2.5`) keeps the last value. When empty
 * means 0, use `fr-number-input`.
 */
@Component({
  selector: 'fr-optional-number-input',
  templateUrl: './optional-number-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class OptionalNumberInput extends Control {
  public readonly value = model<number | undefined>(undefined);
  public readonly min = input<number | undefined>(undefined);
  public readonly max = input<number | undefined>(undefined);
  /** What the empty box says it means ("Any"). */
  public readonly placeholder = input<string | undefined>(undefined);

  protected readonly classes = controlVariants({ numeric: true });
  protected readonly control = viewChild<ElementRef<HTMLInputElement>>('control');

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
    if (raw === '') {
      this.value.set(undefined);
      return;
    }
    const parsed = Number(raw);
    if (Number.isInteger(parsed)) {
      this.value.set(parsed);
    }
  }
}
