import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocaleFormat, Message, Text } from '@pioneer/frontier';

import type { FormulaCheck } from '../formula-check';
import { CheckStatus } from '../rules-check';

/**
 * A formula check's result: the value (or why it has none), the canonical text and the tree; or, when the
 * formula does not parse, the text with a caret under the mistake.
 */
@Component({
  selector: 'pio-formula-result',
  imports: [Message, Text, TranslocoPipe],
  templateUrl: './formula-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaResult {
  readonly #format = inject(LocaleFormat);
  protected readonly CheckStatus = CheckStatus;
  public readonly check = input.required<FormulaCheck>();
  /** The value in the viewer's locale, while there is one. */
  protected readonly value = computed((): string => {
    const check = this.check();
    const valued = check.status === CheckStatus.Valid && check.evaluation.status === CheckStatus.Valid;
    return valued ? this.#format.number(check.evaluation.value) : '';
  });
}
