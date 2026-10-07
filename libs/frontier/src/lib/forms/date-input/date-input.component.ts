import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import { Temporal } from '@pioneer/shared/kernel';

import { CONTROL_CLASSES } from '../control-classes';
import { Field } from '../field/field.component';

/** Calendar date control backed by `Temporal.PlainDate` (native picker). */
@Component({
  selector: 'fr-date-input',
  imports: [Field],
  templateUrl: './date-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class DateInput implements FormValueControl<Temporal.PlainDate | undefined> {
  public readonly value = model<Temporal.PlainDate | undefined>(undefined);
  public readonly label = input.required<string>();
  public readonly hint = input<string | undefined>(undefined);
  public readonly error = input<string | undefined>(undefined);
  /** Bound by signal forms through `[formField]`. */
  public readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  public readonly touched = input(false, { transform: booleanAttribute });
  protected readonly message = computed(() => this.error() ?? (this.touched() ? this.errors()[0]?.message : undefined));
  public readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly controlClasses = CONTROL_CLASSES;
  protected readonly iso = computed(() => this.value()?.toString() ?? '');

  protected onInput(raw: string): void {
    this.value.set(raw === '' ? undefined : Temporal.PlainDate.from(raw));
  }
}
