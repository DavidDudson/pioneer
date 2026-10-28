import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { RefreshableInput } from '../../controls/refreshable-input/refreshable-input.component';
import { BoundField } from '../bound-field';
import { FieldError } from '../field/error/error.component';
import { Field } from '../field/field.component';
import { FieldHint } from '../field/hint/hint.component';
import { Label } from '../field/label/label.component';

/**
 * Labelled field for a value that is fetched (`fr-refreshable-input`) for forms. Bind with `[formField]`. Buttons
 * marked `frAction` go before the refresh button.
 */
@Component({
  selector: 'fr-refreshable-field',
  imports: [Field, FieldError, FieldHint, Label, RefreshableInput],
  templateUrl: './refreshable-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class RefreshableField extends BoundField implements FormValueControl<string> {
  public readonly value = model<string>('');
  public readonly placeholder = input('');
  /** Fetches a new value: on first render, and whenever refresh is pressed. */
  public readonly load = input.required<() => Promise<string>>();
}
