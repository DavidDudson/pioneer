import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Field, FieldError, FieldHint, Label, Stack, TextArea } from '@pioneer/frontier';

import { CheckStatus } from '../rules-check';
import type { JsonProblem } from '../rules-check';
import { StatisticsStatus } from '../statistics-check';
import type { StatisticsCheck } from '../statistics-check';

const DEFINITION_ROWS = 16;
const INPUT_ROWS = 8;

/** The statistics tool's inputs: the definitions as a JSON array and the character's inputs, each with its problem. */
@Component({
  selector: 'pio-statistics-fields',
  imports: [Field, FieldError, FieldHint, Label, Stack, TextArea, TranslocoPipe],
  templateUrl: './statistics-fields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsFields {
  protected readonly CheckStatus = CheckStatus;
  protected readonly definitionRows = DEFINITION_ROWS;
  protected readonly inputRows = INPUT_ROWS;
  public readonly check = input.required<StatisticsCheck>();
  public readonly definitions = model.required<string>();
  public readonly inputs = model.required<string>();

  protected readonly definitionsProblem = computed((): JsonProblem | undefined => {
    const result = this.check();
    return result.status === StatisticsStatus.Problems ? result.definitions : undefined;
  });

  protected readonly inputsProblem = computed((): JsonProblem | undefined => {
    const result = this.check();
    return result.status === StatisticsStatus.Problems ? result.inputs : undefined;
  });
}
