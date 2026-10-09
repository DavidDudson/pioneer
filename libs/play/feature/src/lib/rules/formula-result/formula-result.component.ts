import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Message, Text } from '@pioneer/frontier';

import type { FormulaCheck } from '../formula-check';
import { CheckStatus } from '../rules-check';

/** A formula check's result: the canonical text and tree, or the text with a caret under the mistake. */
@Component({
  selector: 'pio-formula-result',
  imports: [Message, Text, TranslocoPipe],
  templateUrl: './formula-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaResult {
  protected readonly CheckStatus = CheckStatus;
  public readonly check = input.required<FormulaCheck>();
}
