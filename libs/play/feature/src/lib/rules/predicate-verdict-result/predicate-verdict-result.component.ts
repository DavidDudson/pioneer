import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Message, Text } from '@pioneer/frontier';

import { TRUTH_TONES, VERDICT_KEYS, VerdictStatus } from '../predicate-verdict';
import type { VerdictCheck } from '../predicate-verdict';
import { RulesResult } from '../rules-result/rules-result.component';
import { VerdictStatements } from '../verdict-statements/verdict-statements.component';

/**
 * A predicate's verdict, then every statement's as a nested list, so it is clear which part held, which failed and
 * which depends on the situation. Problems with the predicate or the roll options show instead.
 */
@Component({
  selector: 'pio-predicate-verdict-result',
  imports: [Message, RulesResult, Text, TranslocoPipe, VerdictStatements],
  templateUrl: './predicate-verdict-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredicateVerdictResult {
  protected readonly VerdictStatus = VerdictStatus;
  protected readonly VERDICT_KEYS = VERDICT_KEYS;
  protected readonly TRUTH_TONES = TRUTH_TONES;
  public readonly check = input.required<VerdictCheck>();
}
