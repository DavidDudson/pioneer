import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';

import { CONTROL_CLASSES } from '../control-classes';
import { Field } from '../field/field.component';

/** Labelled integer control with native stepping. */
@Component({
  selector: 'fr-number-input',
  imports: [Field],
  templateUrl: './number-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class NumberInput implements FormValueControl<number> {
  public readonly value = model(0);
  public readonly label = input.required<string>();
  public readonly hint = input<string | undefined>(undefined);
  public readonly error = input<string | undefined>(undefined);
  /** Bound by signal forms through `[formField]`. */
  public readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  public readonly touched = input(false, { transform: booleanAttribute });
  protected readonly message = computed(() => this.error() ?? (this.touched() ? this.errors()[0]?.message : undefined));
  public readonly min = input<number | undefined>(undefined);
  public readonly max = input<number | undefined>(undefined);
  public readonly disabled = input(false, { transform: booleanAttribute });
  public readonly hideLabel = input(false, { transform: booleanAttribute });
  public readonly committed = output();
  public readonly cancelled = output();

  protected readonly controlClasses = `${CONTROL_CLASSES} tabular-nums`;

  protected onInput(raw: string): void {
    const parsed = Number(raw);
    if (raw !== '' && Number.isInteger(parsed)) {
      this.value.set(parsed);
    }
  }
}
