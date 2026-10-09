import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { ToggleButton } from '../../controls/toggle-button/toggle-button.component';
import { BoundField } from '../bound-field';
import { FieldError } from '../field/error/error.component';
import { Field } from '../field/field.component';
import { FieldHint } from '../field/hint/hint.component';
import { Label } from '../field/label/label.component';

/**
 * Labelled on/off setting for forms. Bind with `[formField]`; for inline editing use the plain
 * `fr-toggle-button`. The label is the button's text, so it names the setting in both states;
 * the `<label>` stays for screen readers only and `hideLabel` has no effect.
 */
@Component({
  selector: 'fr-toggle-button-field',
  imports: [Field, FieldError, FieldHint, Label, ToggleButton],
  templateUrl: './toggle-button-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ToggleButtonField extends BoundField implements FormValueControl<boolean> {
  public readonly value = model(false);
}
