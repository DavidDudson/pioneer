import { RichText } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { checkFilters } from './filters-check';
import type { FiltersCheck } from './filters-check';
import { checkFormula } from './formula-check';
import type { FormulaCheck, ReferenceEntries } from './formula-check';
import { checkGrants } from './grants-check';
import type { GrantsCheck } from './grants-check';
import { checkVerdict } from './predicate-verdict';
import type { VerdictCheck } from './predicate-verdict';
import { CheckStatus, checkOutcome, checkRulesJson, readJson, RulesTool } from './rules-check';
import type { CheckOutcome } from './rules-check';
import { checkStatistics } from './statistics-check';
import type { StatisticsCheck } from './statistics-check';

/**
 * What kind of answer a tool gives: a schema check, a schema check with a rich text preview, a parsed formula, a
 * predicate's verdict, statistics, grants or filtered content.
 */
export const ToolKind = {
  Schema: 'schema',
  RichText: 'rich-text',
  Formula: 'formula',
  Verdict: 'verdict',
  Statistics: 'statistics',
  Grants: 'grants',
  Filters: 'filters',
} as const;
export type ToolKind = ValueOf<typeof ToolKind>;

export type { ReferenceEntries } from './formula-check';
export { EXAMPLE_GRANT_LEVEL, EXAMPLE_GRANT_PICKS, EXAMPLE_GRANT_ROOTS, EXAMPLE_GRANT_TOGGLES } from './grant-examples';
export { EXAMPLE_FILTER_QUERY } from './filter-examples';
export { EXAMPLE_FACTS } from './predicate-verdict';
export { EXAMPLE_OVERRIDES, EXAMPLE_RULE_ELEMENTS, EXAMPLE_STATISTIC_INPUTS } from './statistics-check';
export { CheckStatus, contentEntryExample, RULES_TOOL_KEYS, rulesExample, RulesTool } from './rules-check';
export { CONTENT_KIND_KEYS } from './content-entry-examples';

/**
 * What the tools read besides the main text: roll options for the verdict, reference values for formulas, the
 * character's inputs and rule elements for statistics, the root entries, picks, toggles and level for grants, and the
 * query for filters; statistics and grants read the roll options too.
 */
export interface ToolInputs {
  readonly facts: string;
  readonly entries: ReferenceEntries;
  readonly statisticInputs: string;
  readonly statisticRules: string;
  readonly grantRoots: string;
  readonly statisticOverrides: string;
  readonly grantPicks: string;
  readonly grantToggles: string;
  readonly grantLevel: number;
  readonly filterQuery: string;
}

export type ToolCheck =
  | { readonly kind: typeof ToolKind.Schema; readonly check: CheckOutcome }
  | { readonly kind: typeof ToolKind.RichText; readonly check: CheckOutcome; readonly preview: RichText | undefined }
  | { readonly kind: typeof ToolKind.Formula; readonly check: FormulaCheck }
  | { readonly kind: typeof ToolKind.Verdict; readonly check: VerdictCheck }
  | { readonly kind: typeof ToolKind.Statistics; readonly check: StatisticsCheck }
  | { readonly kind: typeof ToolKind.Grants; readonly check: GrantsCheck }
  | { readonly kind: typeof ToolKind.Filters; readonly check: FiltersCheck };

/** The rich text check, with the document to preview once it validates; the text is parsed once for both. */
function checkRichText(text: string): ToolCheck {
  const read = readJson(RichText, text);
  const preview = read.status === CheckStatus.Valid ? read.value : undefined;
  return { kind: ToolKind.RichText, check: checkOutcome(RichText, read), preview };
}

type CharacterTool = typeof RulesTool.Grants | typeof RulesTool.Statistics;

/** The tools that work on a character: statistics and grants. */
function checkCharacter(tool: CharacterTool, text: string, inputs: ToolInputs): ToolCheck {
  if (tool === RulesTool.Statistics) {
    return {
      kind: ToolKind.Statistics,
      check: checkStatistics({
        definitions: text,
        inputs: inputs.statisticInputs,
        rules: inputs.statisticRules,
        overrides: inputs.statisticOverrides,
        facts: inputs.facts,
      }),
    };
  }
  return {
    kind: ToolKind.Grants,
    check: checkGrants({
      entries: text,
      roots: inputs.grantRoots,
      picks: inputs.grantPicks,
      toggles: inputs.grantToggles,
      facts: inputs.facts,
      level: inputs.grantLevel,
    }),
  };
}

/** Run the chosen tool on the page's text and whichever extra inputs it reads. Never throws. */
export function checkTool(tool: RulesTool, text: string, inputs: ToolInputs): ToolCheck {
  if (tool === RulesTool.Formula) {
    return { kind: ToolKind.Formula, check: checkFormula(text, inputs.entries) };
  }
  if (tool === RulesTool.Verdict) {
    return { kind: ToolKind.Verdict, check: checkVerdict(text, inputs.facts) };
  }
  if (tool === RulesTool.Statistics || tool === RulesTool.Grants) {
    return checkCharacter(tool, text, inputs);
  }
  if (tool === RulesTool.Filters) {
    return { kind: ToolKind.Filters, check: checkFilters(text, inputs.filterQuery) };
  }
  if (tool === RulesTool.RichText) {
    return checkRichText(text);
  }
  return { kind: ToolKind.Schema, check: checkRulesJson(tool, text) };
}
