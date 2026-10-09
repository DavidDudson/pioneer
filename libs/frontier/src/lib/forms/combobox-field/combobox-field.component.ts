import { booleanAttribute, ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { Combobox } from '../../controls/combobox/combobox.component';
import type { SelectOption } from '../../controls/select/select.component';
import { BoundField } from '../bound-field';
import { FieldError } from '../field/error/error.component';
import { Field } from '../field/field.component';
import { FieldHint } from '../field/hint/hint.component';
import { Label } from '../field/label/label.component';

/**
 * Labelled pick-from-a-long-list field for forms. Bind with `[formField]`; run the query from
 * `searched` and pass the matches as `options`. For inline editing use the plain `fr-combobox`.
 */
@Component({
  selector: 'fr-combobox-field',
  imports: [Combobox, Field, FieldError, FieldHint, Label],
  templateUrl: './combobox-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ComboboxField<TValue extends string> extends BoundField implements FormValueControl<TValue | undefined> {
  public readonly value = model<TValue | undefined>(undefined);
  public readonly options = input.required<readonly SelectOption<TValue>[]>();
  public readonly loading = input(false, { transform: booleanAttribute });
  public readonly placeholder = input('');
  public readonly searched = output<string>();
}
