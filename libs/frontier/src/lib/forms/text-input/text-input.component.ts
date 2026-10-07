import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';

import { CONTROL_CLASSES } from '../control-classes';
import { Field } from '../field/field.component';

/** Labelled single-line text control. Works with `[formField]` or `[(value)]`. */
@Component({
  selector: 'fr-text-input',
  imports: [Field],
  templateUrl: './text-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class TextInput implements FormValueControl<string> {
  public readonly value = model('');
  public readonly label = input.required<string>();
  public readonly hint = input<string | undefined>(undefined);
  public readonly error = input<string | undefined>(undefined);
  /** Bound by signal forms through `[formField]`. */
  public readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  public readonly touched = input(false, { transform: booleanAttribute });
  protected readonly message = computed(() => this.error() ?? (this.touched() ? this.errors()[0]?.message : undefined));
  public readonly placeholder = input('');
  public readonly disabled = input(false, { transform: booleanAttribute });
  public readonly hideLabel = input(false, { transform: booleanAttribute });
  public readonly committed = output();
  public readonly cancelled = output();

  protected readonly controlClasses = CONTROL_CLASSES;
}
