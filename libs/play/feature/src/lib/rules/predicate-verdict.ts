import { PredicateFacts, tracePredicate, Truth } from '@pioneer/rules/predicate';
import type { StatementTrace } from '@pioneer/rules/predicate';
import { isPredicateComparison, Predicate, RollOption } from '@pioneer/rules/sdk';
import type { PredicateStatement } from '@pioneer/rules/sdk';
import type { FieldIssue, ValueOf } from '@pioneer/shared/kernel';

import { checkRulesJson, CheckStatus, RulesSchema } from './rules-check';

/** Roll options the example starts with: a frightened level 5 character, in no particular place. */
export const EXAMPLE_FACTS = ['self:condition:frightened', 'self:level:5'].join('\n');

/** Message keys for each verdict, spelled out so the key check sees them. */
export const TRUTH_KEYS: Readonly<Record<Truth, string>> = {
  [Truth.True]: 'play.rules.truth.true',
  [Truth.False]: 'play.rules.truth.false',
  [Truth.Unknown]: 'play.rules.truth.unknown',
};

/** Message keys for the whole predicate's verdict. */
export const VERDICT_KEYS: Readonly<Record<Truth, string>> = {
  [Truth.True]: 'play.rules.verdict.true',
  [Truth.False]: 'play.rules.verdict.false',
  [Truth.Unknown]: 'play.rules.verdict.unknown',
};

/** How each verdict is coloured: holds, does not hold, depends on the situation. */
export const TRUTH_TONES = {
  [Truth.True]: 'success',
  [Truth.False]: 'danger',
  [Truth.Unknown]: 'warning',
} as const satisfies Readonly<Record<Truth, string>>;

/** One statement as the playground shows it: its code, its verdict and the statements inside it. */
export interface VerdictNode {
  /** The roll option, the comparison as JSON, or the compound's operator (`or`, `if`). */
  readonly code: string;
  readonly truth: Truth;
  readonly children: readonly VerdictNode[];
}

export const VerdictStatus = { ...CheckStatus, InvalidFacts: 'invalid-facts' } as const;
export type VerdictStatus = ValueOf<typeof VerdictStatus>;

export type VerdictCheck =
  | { readonly status: typeof VerdictStatus.Valid; readonly truth: Truth; readonly statements: readonly VerdictNode[] }
  | { readonly status: typeof VerdictStatus.NotJson }
  | { readonly status: typeof VerdictStatus.Invalid; readonly issues: readonly FieldIssue[] }
  /** `lines` are the 1-based lines of the roll option list that are not roll options. */
  | { readonly status: typeof VerdictStatus.InvalidFacts; readonly lines: readonly number[] };

const LINE = /\r?\n/u;

/** The code shown for a statement: an option as is, a comparison as JSON, a compound by its operator. */
function codeOf(statement: PredicateStatement): string {
  if (typeof statement === 'string') {
    return statement;
  }
  return isPredicateComparison(statement) ? JSON.stringify(statement) : Object.keys(statement).join('/');
}

function toNode(trace: StatementTrace): VerdictNode {
  return {
    code: codeOf(trace.statement),
    truth: trace.truth,
    children: trace.children.map((child) => toNode(child)),
  };
}

/** Roll options read from text, or the 1-based lines that are not roll options. */
type FactsParse = { readonly options: readonly RollOption[] } | { readonly lines: readonly number[] };

/** The roll options, one per line, blank lines skipped; or the lines that are not roll options. */
function parseFacts(text: string): FactsParse {
  const lines = text.split(LINE).map((line, index) => ({ text: line.trim(), number: index + 1 }));
  const filled = lines.filter((line) => line.text !== '');
  const bad = filled.filter((line) => !RollOption.safeParse(line.text).success).map((line) => line.number);
  return bad.length > 0 ? { lines: bad } : { options: filled.map((line) => RollOption.parse(line.text)) };
}

/**
 * Check `predicateText` as a predicate, read `factsText` as roll options (one per line), then evaluate with the
 * default namespace table and keep every statement's verdict. Never throws.
 */
export function checkVerdict(predicateText: string, factsText: string): VerdictCheck {
  const checked = checkRulesJson(RulesSchema.Predicate, predicateText);
  if (checked.status !== CheckStatus.Valid) {
    return checked;
  }
  const facts = parseFacts(factsText);
  if ('lines' in facts) {
    return { status: VerdictStatus.InvalidFacts, lines: facts.lines };
  }
  const trace = tracePredicate(Predicate.parse(JSON.parse(checked.parsed)), new PredicateFacts(facts.options));
  return { status: VerdictStatus.Valid, truth: trace.truth, statements: trace.statements.map((node) => toNode(node)) };
}
