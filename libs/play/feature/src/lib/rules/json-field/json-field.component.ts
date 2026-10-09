import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Field, FieldError, FieldHint, Label, TextArea } from '@pioneer/frontier';

import { CheckStatus } from '../rules-check';
import type { JsonProblem } from '../rules-check';

const DEFAULT_ROWS = 12;

/** A labelled JSON text area that says whether its text is not JSON yet, or how many problems the value has. */
@Component({
  selector: 'pio-json-field',
  imports: [Field, FieldError, FieldHint, Label, TextArea, TranslocoPipe],
  templateUrl: './json-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonField {
  protected readonly CheckStatus = CheckStatus;
  /** The label, and the hint shown while the text reads, in the UI locale. */
  public readonly label = input.required<string>();
  public readonly hint = input.required<string>();
  public readonly problem = input.required<JsonProblem | undefined>();
  public readonly rows = input(DEFAULT_ROWS);
  public readonly value = model.required<string>();
}
