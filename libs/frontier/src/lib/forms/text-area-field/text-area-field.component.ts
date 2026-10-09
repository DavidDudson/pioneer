import { booleanAttribute, ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { TextArea } from '../../controls/text-area/text-area.component';
import { BoundField } from '../bound-field';
import { FieldError } from '../field/error/error.component';
import { Field } from '../field/field.component';
import { FieldHint } from '../field/hint/hint.component';
import { Label } from '../field/label/label.component';

const DEFAULT_ROWS = 6;

/** Labelled multi-line text field for forms. Bind with `[formField]`; for inline editing use the plain `fr-text-area`. */
@Component({
  selector: 'fr-text-area-field',
  imports: [Field, FieldError, FieldHint, Label, TextArea],
  templateUrl: './text-area-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class TextAreaField extends BoundField implements FormValueControl<string> {
  public readonly value = model<string>('');
  public readonly placeholder = input('');
  /** Visible lines before it scrolls; the user can drag it taller. */
  public readonly rows = input(DEFAULT_ROWS);
  public readonly monospace = input(false, { transform: booleanAttribute });
}
