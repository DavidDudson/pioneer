import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { OverlayModule } from '@angular/cdk/overlay';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';

import { CONTROL_CLASSES } from '../control-classes';
import { Field } from '../field/field.component';

export interface SelectOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
}

/**
 * Single-select dropdown on `@angular/aria` (combobox + listbox): keyboard
 * navigation, typeahead and ARIA come from the primitive, looks from tokens.
 */
@Component({
  selector: 'fr-select',
  imports: [Combobox, ComboboxPopup, ComboboxWidget, Field, Listbox, Option, OverlayModule],
  templateUrl: './select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Select<TValue extends string> implements FormValueControl<TValue | undefined> {
  /** Selected value; `undefined` or `''` shows the placeholder. */
  public readonly value = model<TValue | undefined>(undefined);
  public readonly options = input.required<readonly SelectOption<TValue>[]>();
  public readonly label = input.required<string>();
  public readonly placeholder = input('Select…');
  public readonly hint = input<string | undefined>(undefined);
  public readonly error = input<string | undefined>(undefined);
  /** Bound by signal forms through `[formField]`. */
  public readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  public readonly touched = input(false, { transform: booleanAttribute });
  protected readonly message = computed(() => this.error() ?? (this.touched() ? this.errors()[0]?.message : undefined));
  public readonly disabled = input(false, { transform: booleanAttribute });
  public readonly hideLabel = input(false, { transform: booleanAttribute });
  /** Emits after the user picks an option (not on programmatic changes). */
  public readonly committed = output<TValue>();
  public readonly cancelled = output();

  protected readonly expanded = signal(false);
  protected readonly selected = computed<TValue[]>(() => {
    const value = this.value();
    return value === undefined || value === '' ? [] : [value];
  });
  protected readonly selectedLabel = computed(
    () => this.options().find((option) => option.value === this.value())?.label ?? this.placeholder(),
  );
  protected readonly triggerClasses = `${CONTROL_CLASSES} flex items-center justify-between text-left`;

  protected choose(values: readonly TValue[]): void {
    const [value] = values;
    this.expanded.set(false);
    if (value !== undefined) {
      this.value.set(value);
      this.committed.emit(value);
    }
  }
}
