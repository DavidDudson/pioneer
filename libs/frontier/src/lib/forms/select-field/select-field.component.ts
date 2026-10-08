import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { Select } from '../../controls/select/select.component';
import type { SelectOption } from '../../controls/select/select.component';
import { BoundField } from '../bound-field';
import { FieldError } from '../field/error/error.component';
import { Field } from '../field/field.component';
import { FieldHint } from '../field/hint/hint.component';
import { Label } from '../field/label/label.component';

/** Labelled single-select field for forms. Bind with `[formField]`; for inline editing use the plain `fr-select`. */
@Component({
  selector: 'fr-select-field',
  imports: [Field, FieldError, FieldHint, Label, Select],
  templateUrl: './select-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class SelectField<TValue extends string> extends BoundField implements FormValueControl<TValue | undefined> {
  public readonly value = model<TValue | undefined>(undefined);
  public readonly options = input.required<readonly SelectOption<TValue>[]>();
  public readonly placeholder = input('Select…');
}
