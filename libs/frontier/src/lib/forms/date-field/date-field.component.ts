import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import type { Temporal } from '@pioneer/shared/kernel';

import { DateInput } from '../../controls/date-input/date-input.component';
import { BoundField } from '../bound-field';
import { FieldError } from '../field/error/error.component';
import { Field } from '../field/field.component';
import { FieldHint } from '../field/hint/hint.component';
import { Label } from '../field/label/label.component';

/** Labelled date field for forms. Bind with `[formField]`; for inline editing use the plain `fr-date-input`. */
@Component({
  selector: 'fr-date-field',
  imports: [Field, FieldError, FieldHint, Label, DateInput],
  templateUrl: './date-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class DateField extends BoundField implements FormValueControl<Temporal.PlainDate | undefined> {
  public readonly value = model<Temporal.PlainDate | undefined>(undefined);
}
