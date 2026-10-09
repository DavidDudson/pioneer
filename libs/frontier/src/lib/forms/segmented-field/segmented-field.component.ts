import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { Segmented } from '../../controls/segmented/segmented.component';
import type { SelectOption } from '../../controls/select/select.component';
import { BoundField } from '../bound-field';
import { FieldError } from '../field/error/error.component';
import { Field } from '../field/field.component';
import { FieldHint } from '../field/hint/hint.component';
import { Label } from '../field/label/label.component';

/**
 * Labelled single-select for forms, preferred for two or three options. Bind with `[formField]`; for
 * inline editing use the plain `fr-segmented`. Prefer `fr-select-field` for four or more.
 */
@Component({
  selector: 'fr-segmented-field',
  imports: [Field, FieldError, FieldHint, Label, Segmented],
  templateUrl: './segmented-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class SegmentedField<TValue extends string> extends BoundField implements FormValueControl<TValue | undefined> {
  public readonly value = model<TValue | undefined>(undefined);
  public readonly options = input.required<readonly SelectOption<TValue>[]>();
}
