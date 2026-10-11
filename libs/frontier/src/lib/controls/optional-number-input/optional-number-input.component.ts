import { ChangeDetectionStrategy, Component, computed, input, model, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';

import { injectCommitKeys } from '../commit-keys';
import { Control } from '../control';
import { controlVariants } from '../control.variants';

/**
 * Plain number control that may be left empty: `value` is undefined while the box is empty, as for an open bound
 * of a range ("any level"). Whole numbers only unless `step` is a fraction; mid-edit text that doesn't read (`-`, or
 * `2.5` in a whole-number box) keeps the last value. When empty means 0, use `fr-number-input`.
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
  /** The smallest change: 1 takes whole numbers only; 0.1 takes tenths too (a tenth of a Bulk is light). */
  public readonly step = input(1);

  protected readonly classes = controlVariants({ numeric: true });
  /** A whole-number box shows the numeric keypad; one with fractions needs the decimal point. */
  protected readonly inputMode = computed(() => (Number.isInteger(this.step()) ? 'numeric' : 'decimal'));
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
    const fits = Number.isInteger(this.step()) ? Number.isInteger(parsed) : Number.isFinite(parsed);
    if (fits) {
      this.value.set(parsed);
    }
  }
}
