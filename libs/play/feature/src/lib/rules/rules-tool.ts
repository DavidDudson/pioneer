import type { ValueOf } from '@pioneer/shared/kernel';

import { checkFormula } from './formula-check';
import type { FormulaCheck, ReferenceEntries } from './formula-check';
import { checkVerdict } from './predicate-verdict';
import type { VerdictCheck } from './predicate-verdict';
import { checkRulesJson, RulesTool } from './rules-check';
import type { CheckOutcome } from './rules-check';
import { checkStatistics } from './statistics-check';
import type { StatisticsCheck } from './statistics-check';

/** What kind of answer a tool gives: a schema check, a parsed formula, a predicate's verdict, or statistics. */
export const ToolKind = { Schema: 'schema', Formula: 'formula', Verdict: 'verdict', Statistics: 'statistics' } as const;
export type ToolKind = ValueOf<typeof ToolKind>;

export type { ReferenceEntries } from './formula-check';
export { EXAMPLE_FACTS } from './predicate-verdict';
export { EXAMPLE_RULE_ELEMENTS, EXAMPLE_STATISTIC_INPUTS } from './statistics-check';
export { CheckStatus, RULES_TOOL_KEYS, rulesExample, RulesTool } from './rules-check';

/**
 * What the tools read besides the main text: roll options for the verdict, reference values for formulas, the
 * character's inputs and rule elements for statistics, which read the roll options too.
 */
export interface ToolInputs {
  readonly facts: string;
  readonly entries: ReferenceEntries;
  readonly statisticInputs: string;
  readonly statisticRules: string;
}

export type ToolCheck =
  | { readonly kind: typeof ToolKind.Schema; readonly check: CheckOutcome }
  | { readonly kind: typeof ToolKind.Formula; readonly check: FormulaCheck }
  | { readonly kind: typeof ToolKind.Verdict; readonly check: VerdictCheck }
  | { readonly kind: typeof ToolKind.Statistics; readonly check: StatisticsCheck };

/** Run the chosen tool on the page's text and whichever extra inputs it reads. Never throws. */
export function checkTool(tool: RulesTool, text: string, inputs: ToolInputs): ToolCheck {
  if (tool === RulesTool.Formula) {
    return { kind: ToolKind.Formula, check: checkFormula(text, inputs.entries) };
  }
  if (tool === RulesTool.Verdict) {
    return { kind: ToolKind.Verdict, check: checkVerdict(text, inputs.facts) };
  }
  if (tool === RulesTool.Statistics) {
    return {
      kind: ToolKind.Statistics,
      check: checkStatistics({
        definitions: text,
        inputs: inputs.statisticInputs,
        rules: inputs.statisticRules,
        facts: inputs.facts,
      }),
    };
  }
  return { kind: ToolKind.Schema, check: checkRulesJson(tool, text) };
}
