import { ChangeDetectionStrategy, Component, input, model, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';

import { injectCommitKeys } from '../commit-keys';
import { Control } from '../control';
import { controlVariants } from '../control.variants';

/** Plain integer control with native stepping. In a form use `fr-number-field`. */
@Component({
  selector: 'fr-number-input',
  templateUrl: './number-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class NumberInput extends Control {
  public readonly value = model(0);
  /**
   * Whether the box holds a whole number. While it is empty or mid-edit (`-`, `2.5`) `value` keeps the
   * last whole number, so bind this to tell a stale value from the one shown.
   */
  public readonly complete = model(true);
  public readonly min = input<number | undefined>(undefined);
  public readonly max = input<number | undefined>(undefined);

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
    const parsed = Number(raw);
    const whole = raw !== '' && Number.isInteger(parsed);
    this.complete.set(whole);
    if (whole) {
      this.value.set(parsed);
    }
  }
}
