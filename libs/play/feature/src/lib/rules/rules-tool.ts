import { bookRegistry, sourceIssues } from '@pioneer/rules/catalog';
import type { NamespaceTable } from '@pioneer/rules/predicate';
import { ContentEntry, RichText } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { checkFilters } from './filters-check';
import type { FiltersCheck } from './filters-check';
import { checkFormula } from './formula-check';
import type { FormulaCheck, ReferenceEntries } from './formula-check';
import { checkGrants, GrantsStatus } from './grants-check';
import type { GrantsCheck } from './grants-check';
import { checkVerdict, VerdictStatus } from './predicate-verdict';
import type { VerdictCheck } from './predicate-verdict';
import { CheckStatus, checkOutcome, checkRulesJson, readJson, RulesSchema, RulesTool } from './rules-check';
import type { CheckOutcome } from './rules-check';
import { checkStatistics, StatisticsStatus } from './statistics-check';
import type { StatisticProficiency, StatisticsCheck } from './statistics-check';

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
  /** How the statistics tool turns proficiency into bonuses; undefined until the core rules pack loads. */
  readonly proficiency: StatisticProficiency | undefined;
  /** How the verdict, statistics and grants tools read missing roll options; undefined until the core rules pack loads. */
  readonly namespaces: NamespaceTable | undefined;
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

/** A content entry, then its sources against the book registry, so a wrong source shows on its own field. */
function checkContentEntry(text: string): CheckOutcome {
  const read = readJson(ContentEntry, text);
  if (read.status !== CheckStatus.Valid) {
    return read;
  }
  const issues = sourceIssues(read.value, bookRegistry);
  return issues.length > 0 ? { status: CheckStatus.Invalid, issues } : checkOutcome(ContentEntry, read);
}

/** The schema tools: a plain schema check, or one with a preview (rich text) or registry checks (content entries). */
function checkSchema(schema: RulesSchema, text: string): ToolCheck {
  if (schema === RulesSchema.RichText) {
    return checkRichText(text);
  }
  if (schema === RulesSchema.ContentEntry) {
    return { kind: ToolKind.Schema, check: checkContentEntry(text) };
  }
  return { kind: ToolKind.Schema, check: checkRulesJson(schema, text) };
}

type CharacterTool = typeof RulesTool.Grants | typeof RulesTool.Statistics;

/** The tools that work on a character: statistics and grants. */
function checkCharacter(tool: CharacterTool, text: string, inputs: ToolInputs): ToolCheck {
  if (tool === RulesTool.Statistics) {
    const { proficiency, namespaces } = inputs;
    if (proficiency === undefined || namespaces === undefined) {
      return { kind: ToolKind.Statistics, check: { status: StatisticsStatus.Pending } };
    }
    const texts = {
      definitions: text,
      inputs: inputs.statisticInputs,
      rules: inputs.statisticRules,
      overrides: inputs.statisticOverrides,
      facts: inputs.facts,
    };
    return { kind: ToolKind.Statistics, check: checkStatistics(texts, proficiency, namespaces) };
  }
  const { namespaces } = inputs;
  if (namespaces === undefined) {
    return { kind: ToolKind.Grants, check: { status: GrantsStatus.Pending } };
  }
  return {
    kind: ToolKind.Grants,
    check: checkGrants(
      {
        entries: text,
        roots: inputs.grantRoots,
        picks: inputs.grantPicks,
        toggles: inputs.grantToggles,
        facts: inputs.facts,
        level: inputs.grantLevel,
      },
      namespaces,
    ),
  };
}

/** The predicate's verdict against the roll options, once the namespaces that read them have loaded. */
function verdictOf(text: string, { facts, namespaces }: ToolInputs): VerdictCheck {
  return namespaces === undefined ? { status: VerdictStatus.Pending } : checkVerdict(text, facts, namespaces);
}

/** Run the chosen tool on the page's text and whichever extra inputs it reads. Never throws. */
export function checkTool(tool: RulesTool, text: string, inputs: ToolInputs): ToolCheck {
  if (tool === RulesTool.Formula) {
    return { kind: ToolKind.Formula, check: checkFormula(text, inputs.entries) };
  }
  if (tool === RulesTool.Verdict) {
    return { kind: ToolKind.Verdict, check: verdictOf(text, inputs) };
  }
  if (tool === RulesTool.Statistics || tool === RulesTool.Grants) {
    return checkCharacter(tool, text, inputs);
  }
  if (tool === RulesTool.Filters) {
    return { kind: ToolKind.Filters, check: checkFilters(text, inputs.filterQuery) };
  }
  return checkSchema(tool, text);
}
