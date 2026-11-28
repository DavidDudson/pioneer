import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { Control } from '../control';
import { Input } from '../input/input.component';

/** Plain integer control with native stepping. In a form use `fr-number-field`. */
@Component({
  selector: 'fr-number-input',
  imports: [Input],
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

  protected onInput(raw: string): void {
    const parsed = Number(raw);
    const whole = raw !== '' && Number.isInteger(parsed);
    this.complete.set(whole);

    if (whole) {
      this.value.set(parsed);
    }
  }
}
