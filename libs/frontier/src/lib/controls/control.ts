import { booleanAttribute, computed, Directive, inject, input, output } from '@angular/core';

import { Field } from '../forms/field/field.component';

/**
 * Inputs, outputs and field wiring shared by every plain control. A plain
 * control is just the value widget: no label, hint or error of its own.
 * Inside `fr-field` it takes the field's id, description and invalid state;
 * on its own (e.g. inline editing) give it an `ariaLabel`.
 */
@Directive()
export abstract class Control {
  public readonly disabled = input(false, { transform: booleanAttribute });
  public readonly invalid = input(false, { transform: booleanAttribute });
  public readonly ariaLabel = input<string | undefined>(undefined);
  /** Enter, or a pick from a list: save now. */
  public readonly committed = output();
  /** Escape: drop the change. */
  public readonly cancelled = output();

  readonly #field = inject(Field, { optional: true }) ?? undefined;
  protected readonly id = computed(() => this.#field?.controlId);
  protected readonly describedBy = computed(() => this.#field?.describedBy());
  protected readonly ariaInvalid = computed(() => this.invalid() || (this.#field?.invalid() ?? false));
}
