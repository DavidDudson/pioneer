import type { ValueOf } from '@pioneer/shared/kernel';

import { checkFormula } from './formula-check';
import type { FormulaCheck, ReferenceEntries } from './formula-check';
import { checkVerdict } from './predicate-verdict';
import type { VerdictCheck } from './predicate-verdict';
import { checkRulesJson, RulesTool } from './rules-check';
import type { CheckOutcome } from './rules-check';

/** What kind of answer a tool gives: a schema check, a parsed formula, or a predicate's verdict. */
export const ToolKind = { Schema: 'schema', Formula: 'formula', Verdict: 'verdict' } as const;
export type ToolKind = ValueOf<typeof ToolKind>;

export type { ReferenceEntries } from './formula-check';
export { EXAMPLE_FACTS } from './predicate-verdict';

/** What the tools read besides the main text: roll options for the verdict, reference values for formulas. */
export interface ToolInputs {
  readonly facts: string;
  readonly entries: ReferenceEntries;
}

export type ToolCheck =
  | { readonly kind: typeof ToolKind.Schema; readonly check: CheckOutcome }
  | { readonly kind: typeof ToolKind.Formula; readonly check: FormulaCheck }
  | { readonly kind: typeof ToolKind.Verdict; readonly check: VerdictCheck };

/** Run the chosen tool on the page's text and whichever extra inputs it reads. Never throws. */
export function checkTool(tool: RulesTool, text: string, inputs: ToolInputs): ToolCheck {
  if (tool === RulesTool.Formula) {
    return { kind: ToolKind.Formula, check: checkFormula(text, inputs.entries) };
  }
  if (tool === RulesTool.Verdict) {
    return { kind: ToolKind.Verdict, check: checkVerdict(text, inputs.facts) };
  }
  return { kind: ToolKind.Schema, check: checkRulesJson(tool, text) };
}
