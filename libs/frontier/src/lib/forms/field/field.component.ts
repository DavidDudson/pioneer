import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { uniqueId } from '../../ids';
import { Stack } from '../../layout/stack/stack.component';

/**
 * Root of a labelled control, built from parts:
 *
 * ```html
 * <fr-field [invalid]="error !== undefined">
 *   <fr-label>Name</fr-label>
 *   <fr-text-input [(value)]="name" />
 *   <fr-field-hint>As it appears on the sheet.</fr-field-hint>
 *   <fr-field-error>{{ error }}</fr-field-error>
 * </fr-field>
 * ```
 *
 * Parts and the control find the field through DI: the label points at the
 * control, the control is described by the hint/error that are present and
 * marked invalid with the field. Form components (`fr-text-field`, …)
 * assemble this for you.
 */
@Component({
  selector: 'fr-field',
  imports: [Stack],
  templateUrl: './field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Field {
  public readonly invalid = input(false, { transform: booleanAttribute });

  readonly #id = uniqueId('fr-field');
  public readonly controlId = `${this.#id}-control`;
  public readonly labelId = `${this.#id}-label`;
  public readonly hintId = `${this.#id}-hint`;
  public readonly errorId = `${this.#id}-error`;

  readonly #hints = signal(0);
  readonly #errors = signal(0);
  public readonly describedBy = computed(() => {
    const ids = [this.#errors() > 0 ? this.errorId : '', this.#hints() > 0 ? this.hintId : ''].filter(Boolean);
    return ids.length === 0 ? undefined : ids.join(' ');
  });

  /** Called by `fr-field-hint` / `fr-field-error`; returns the unregister function. */
  public register(part: 'hint' | 'error'): () => void {
    const count = part === 'hint' ? this.#hints : this.#errors;
    count.update((value) => value + 1);
    return (): void => {
      count.update((value) => value - 1);
    };
  }
}
