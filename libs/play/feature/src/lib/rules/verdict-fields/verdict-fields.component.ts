import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Field, FieldError, FieldHint, Label, Stack, TextArea } from '@pioneer/frontier';

import { VerdictStatus } from '../predicate-verdict';
import type { VerdictCheck } from '../predicate-verdict';

const PREDICATE_ROWS = 12;
const FACT_ROWS = 5;

/** The verdict tool's inputs: the predicate as JSON and the roll options, each with its own problem. */
@Component({
  selector: 'pio-verdict-fields',
  imports: [Field, FieldError, FieldHint, Label, Stack, TextArea, TranslocoPipe],
  templateUrl: './verdict-fields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerdictFields {
  protected readonly VerdictStatus = VerdictStatus;
  protected readonly predicateRows = PREDICATE_ROWS;
  protected readonly factRows = FACT_ROWS;
  public readonly check = input.required<VerdictCheck>();
  public readonly predicate = model.required<string>();
  public readonly facts = model.required<string>();
}
