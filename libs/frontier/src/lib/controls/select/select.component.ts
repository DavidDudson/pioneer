import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { cva } from 'class-variance-authority';

import { Control } from '../control';
import { controlVariants } from '../control.variants';

export interface SelectOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
}

const listboxClasses = cva(
  'z-overlay mt-2xs max-h-listbox overflow-auto border border-line-default bg-surface-overlay p-2xs',
)();
const optionClasses = cva(
  'cursor-pointer px-sm py-sm text-body aria-selected:bg-accent-subtle aria-selected:text-accent-fg highlighted:bg-surface-sunken pointer-fine:py-xs',
)();
const placeholderVariants = cva('', { variants: { empty: { true: 'text-fg-subtle', false: '' } } });
const caretClasses = cva('text-fg-subtle')();

/**
 * Plain single-select on `@angular/aria` (combobox + listbox): keyboard
 * navigation, typeahead and ARIA come from the primitive, looks from tokens.
 * `committed` fires when the user picks. In a form use `fr-select-field`.
 */
@Component({
  selector: 'fr-select',
  imports: [Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option, OverlayModule, TranslocoPipe],
  templateUrl: './select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Select<TValue extends string> extends Control {
  /** Selected value; `undefined` or `''` shows the placeholder. */
  public readonly value = model<TValue | undefined>(undefined);
  public readonly options = input.required<readonly SelectOption<TValue>[]>();
  /** Defaults to "Select…" in the viewer's locale. */
  public readonly placeholder = input<string | undefined>(undefined);

  protected readonly expanded = signal(false);
  protected readonly selected = computed<TValue[]>(() => {
    const value = this.value();
    return value === undefined || value === '' ? [] : [value];
  });
  /**
   * The chosen option's label, else the caller's placeholder. `undefined` falls back to the
   * default placeholder through the transloco pipe in the template: unlike `translateSignal`, the
   * pipe doesn't prefix the key with a feature route's message scope.
   */
  protected readonly selectedLabel = computed(
    () => this.options().find((option) => option.value === this.value())?.label ?? this.placeholder(),
  );
  protected readonly triggerClasses = controlVariants({ trigger: true });
  protected readonly listboxClasses = listboxClasses;
  protected readonly optionClasses = optionClasses;
  protected readonly caretClasses = caretClasses;
  protected readonly labelClasses = computed(() => placeholderVariants({ empty: this.selected().length === 0 }));

  protected choose(values: readonly TValue[]): void {
    const [value] = values;
    this.expanded.set(false);
    if (value !== undefined) {
      this.value.set(value);
      this.committed.emit();
    }
  }
}
