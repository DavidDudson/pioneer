import { booleanAttribute, computed, Directive, input } from '@angular/core';
import type { ValidationError } from '@angular/forms/signals';

/**
 * What every form field shares: label, hint, error and the signal-forms
 * contract (`[formField]` binds `errors`, `touched`, `disabled`). A form field
 * is a plain control assembled inside `fr-field` with its parts.
 */
@Directive()
export abstract class BoundField {
  public readonly label = input.required<string>();
  public readonly hint = input<string | undefined>(undefined);
  /** An explicit message; wins over validation errors. */
  public readonly error = input<string | undefined>(undefined);
  /** Bound by signal forms through `[formField]`. */
  public readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  public readonly touched = input(false, { transform: booleanAttribute });
  public readonly disabled = input(false, { transform: booleanAttribute });
  public readonly hideLabel = input(false, { transform: booleanAttribute });

  /** Validation shows once the field is touched (or the form was submitted). */
  protected readonly message = computed(() => this.error() ?? (this.touched() ? this.errors()[0]?.message : undefined));
}
