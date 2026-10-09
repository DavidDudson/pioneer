import { isPredicateComparison } from '@pioneer/rules/sdk';
import type {
  ComparisonOperands,
  ContentText,
  Predicate,
  PredicateComparison,
  PredicateCompound,
  PredicateStatement,
  RollOption,
} from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import { childStatements, evaluatePredicate, evaluateStatement } from './evaluate';
import type { PredicateFacts } from './facts';
import { PredicateMessage } from './messages';
import { Truth } from './truth';

export const SummaryKind = {
  /** One fact, as a message: "in forest". */
  Phrase: 'phrase',
  /** An author's own wording for the whole condition, from content. */
  Authored: 'authored',
  All: 'all',
  Any: 'any',
  Not: 'not',
  ExactlyOne: 'exactly-one',
  AllOrNone: 'all-or-none',
} as const;
export type SummaryKind = ValueOf<typeof SummaryKind>;

/**
 * When a predicate would hold, as data: the parts still unknown, with parts already known to hold left out.
 * The UI turns it into text in the viewer's locale with `formatSummary` (ADR-0009).
 */
export type PredicateSummary =
  | { readonly kind: typeof SummaryKind.Phrase; readonly message: MessageDescriptor }
  | { readonly kind: typeof SummaryKind.Authored; readonly text: ContentText }
  | {
      readonly kind: typeof SummaryKind.All | typeof SummaryKind.Any;
      readonly parts: readonly PredicateSummary[];
    }
  | {
      readonly kind: typeof SummaryKind.ExactlyOne | typeof SummaryKind.AllOrNone;
      readonly parts: readonly PredicateSummary[];
    }
  | { readonly kind: typeof SummaryKind.Not; readonly part: PredicateSummary };

const SEPARATOR = ':';

/**
 * Roll option prefixes with their own phrase. The rest of the option is the phrase's `slug`, and `name` is the
 * same with `_` for `-` (ICU `select` keys cannot hold hyphens), which the `en` text maps to words, falling back
 * to the slug. The longest matching prefix wins.
 */
const VOCABULARY: ReadonlyMap<string, string> = new Map([
  ['action', PredicateMessage.Action],
  ['terrain', PredicateMessage.Terrain],
  ['lighting', PredicateMessage.Lighting],
  ['target:trait', PredicateMessage.TargetTrait],
  ['target:condition', PredicateMessage.TargetCondition],
  ['target:mark', PredicateMessage.TargetMark],
  ['self:participant:initiative:stat', PredicateMessage.InitiativeStatistic],
]);

const COMPARISON_KEYS = {
  eq: PredicateMessage.Equals,
  gt: PredicateMessage.Greater,
  gte: PredicateMessage.GreaterOrEqual,
  lt: PredicateMessage.Less,
  lte: PredicateMessage.LessOrEqual,
} as const;

function phrase(descriptor: MessageDescriptor): PredicateSummary {
  return { kind: SummaryKind.Phrase, message: descriptor };
}

/** An option's phrase: from the vocabulary when a prefix matches, else a generic one naming the option. */
function optionPhrase(option: RollOption): PredicateSummary {
  for (let end = option.lastIndexOf(SEPARATOR); end > 0; end = option.lastIndexOf(SEPARATOR, end - 1)) {
    const key = VOCABULARY.get(option.slice(0, end));
    if (key !== undefined) {
      const slug = option.slice(end + 1);
      return phrase(message(key, { name: slug.replaceAll('-', '_'), slug }));
    }
  }
  return phrase(message(PredicateMessage.Option, { option }));
}

function comparisonParts(statement: PredicateComparison): readonly [string, ComparisonOperands] {
  if ('eq' in statement) {
    return [COMPARISON_KEYS.eq, statement.eq];
  }
  if ('gt' in statement) {
    return [COMPARISON_KEYS.gt, statement.gt];
  }
  if ('gte' in statement) {
    return [COMPARISON_KEYS.gte, statement.gte];
  }
  if ('lt' in statement) {
    return [COMPARISON_KEYS.lt, statement.lt];
  }
  return [COMPARISON_KEYS.lte, statement.lte];
}

function comparisonPhrase(statement: PredicateComparison): PredicateSummary {
  const [key, [option, value]] = comparisonParts(statement);
  return phrase(message(key, { option, value }));
}

/** One part, or several joined by `kind`. Never empty: the caller only joins parts it found unknown. */
function join(
  kind: typeof SummaryKind.All | typeof SummaryKind.Any,
  parts: readonly PredicateSummary[],
): PredicateSummary {
  const [only] = parts;
  return parts.length === 1 && only !== undefined ? only : { kind, parts };
}

function negate(part: PredicateSummary): PredicateSummary {
  return { kind: SummaryKind.Not, part };
}

interface Verdicts {
  readonly truths: readonly Truth[];
  /** Summaries of the children that are unknown, in order. */
  readonly unknown: readonly PredicateSummary[];
}

function verdicts(children: readonly PredicateStatement[], facts: PredicateFacts): Verdicts {
  const truths = children.map((child) => evaluateStatement(child, facts));
  const unknown = children.flatMap((child, index) =>
    truths[index] === Truth.Unknown ? [summariseStatement(child, facts)] : [],
  );
  return { truths, unknown };
}

/** `xor` and `iff`: what is left to decide, given the children already known. */
function summariseCount(isExactlyOne: boolean, children: Verdicts): PredicateSummary {
  const anyTrue = children.truths.includes(Truth.True);
  const anyFalse = children.truths.includes(Truth.False);
  if (isExactlyOne) {
    // One child already holds, so the rest must not.
    return anyTrue
      ? negate(join(SummaryKind.Any, children.unknown))
      : { kind: SummaryKind.ExactlyOne, parts: children.unknown };
  }
  if (anyTrue) {
    return join(SummaryKind.All, children.unknown);
  }
  return anyFalse
    ? negate(join(SummaryKind.Any, children.unknown))
    : { kind: SummaryKind.AllOrNone, parts: children.unknown };
}

/** `if a then b`, which holds unless `a` holds and `b` does not. */
function summariseConditional(children: Verdicts): PredicateSummary {
  const [condition, consequence] = children.truths;
  const [first, second] = children.unknown;
  if (condition === Truth.True && first !== undefined) {
    return first;
  }
  if (consequence === Truth.False && first !== undefined) {
    return negate(first);
  }
  if (first !== undefined && second !== undefined) {
    return join(SummaryKind.Any, [negate(first), second]);
  }
  return join(SummaryKind.Any, children.unknown);
}

/** The summary of a statement already known to be unknown. */
function summariseStatement(statement: PredicateStatement, facts: PredicateFacts): PredicateSummary {
  if (typeof statement === 'string') {
    return optionPhrase(statement);
  }
  if (isPredicateComparison(statement)) {
    return comparisonPhrase(statement);
  }
  return summariseCompound(statement, facts);
}

function summariseCompound(statement: PredicateCompound, facts: PredicateFacts): PredicateSummary {
  const children = verdicts(childStatements(statement), facts);
  if ('and' in statement || 'nand' in statement) {
    const all = join(SummaryKind.All, children.unknown);
    return 'and' in statement ? all : negate(all);
  }
  if ('or' in statement || 'nor' in statement) {
    const any = join(SummaryKind.Any, children.unknown);
    return 'or' in statement ? any : negate(any);
  }
  if ('not' in statement) {
    return negate(join(SummaryKind.All, children.unknown));
  }
  if ('if' in statement) {
    return summariseConditional(children);
  }
  return summariseCount('xor' in statement, children);
}

/**
 * When `predicate` would hold, for a conditional breakdown line: the parts still unknown given `facts`, with
 * known-true parts dropped. `undefined` unless the predicate is unknown. An `authored` summary, written by a
 * content author for a condition the generator words badly, replaces the generated one.
 */
export function summarisePredicate(
  predicate: Predicate,
  facts: PredicateFacts,
  authored?: ContentText,
): PredicateSummary | undefined {
  if (evaluatePredicate(predicate, facts) !== Truth.Unknown) {
    return undefined;
  }
  if (authored !== undefined) {
    return { kind: SummaryKind.Authored, text: authored };
  }
  return join(SummaryKind.All, verdicts(predicate, facts).unknown);
}
