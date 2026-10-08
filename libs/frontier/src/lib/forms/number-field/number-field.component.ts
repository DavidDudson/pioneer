import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { NumberInput } from '../../controls/number-input/number-input.component';
import { BoundField } from '../bound-field';
import { FieldError } from '../field/error/error.component';
import { Field } from '../field/field.component';
import { FieldHint } from '../field/hint/hint.component';
import { Label } from '../field/label/label.component';

/** Labelled integer field for forms. Bind with `[formField]`; for inline editing use the plain `fr-number-input`. */
@Component({
  selector: 'fr-number-field',
  imports: [Field, FieldError, FieldHint, Label, NumberInput],
  templateUrl: './number-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class NumberField extends BoundField implements FormValueControl<number> {
  public readonly value = model<number>(0);
  public readonly min = input<number | undefined>(undefined);
  public readonly max = input<number | undefined>(undefined);
}
