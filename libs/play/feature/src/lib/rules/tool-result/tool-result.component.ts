import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { FormulaResult } from '../formula-result/formula-result.component';
import { GrantsResult } from '../grants-result/grants-result.component';
import { PredicateVerdictResult } from '../predicate-verdict-result/predicate-verdict-result.component';
import { RulesResult } from '../rules-result/rules-result.component';
import { ToolKind } from '../rules-tool';
import type { ToolCheck } from '../rules-tool';
import { StatisticsResult } from '../statistics-result/statistics-result.component';

/** The result of whichever tool is chosen. */
@Component({
  selector: 'pio-tool-result',
  imports: [FormulaResult, GrantsResult, PredicateVerdictResult, RulesResult, StatisticsResult],
  templateUrl: './tool-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolResult {
  protected readonly ToolKind = ToolKind;
  public readonly result = input.required<ToolCheck>();
}
