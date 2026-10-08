import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { TextInput } from '../../controls/text-input/text-input.component';
import { BoundField } from '../bound-field';
import { FieldError } from '../field/error/error.component';
import { Field } from '../field/field.component';
import { FieldHint } from '../field/hint/hint.component';
import { Label } from '../field/label/label.component';

/** Labelled single-line text field for forms. Bind with `[formField]`; for inline editing use the plain `fr-text-input`. */
@Component({
  selector: 'fr-text-field',
  imports: [Field, FieldError, FieldHint, Label, TextInput],
  templateUrl: './text-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class TextField extends BoundField implements FormValueControl<string> {
  public readonly value = model<string>('');
  public readonly placeholder = input('');
}
