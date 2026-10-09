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
import type { MessageDescriptor, MessageParams, ValueOf } from '@pioneer/shared/kernel';

import { childStatements, evaluatePredicate, evaluateStatement } from './evaluate';
import type { PredicateFacts } from './facts';
import { PredicateMessage } from './messages';
import { Truth } from './truth';

export const SummaryKind = {
  /** One condition, as a message: "you are in forest". */
  Phrase: 'phrase',
  /** An author's own wording for the whole condition, from content. */
  Authored: 'authored',
  All: 'all',
  Any: 'any',
  ExactlyOne: 'exactly-one',
  AllOrNone: 'all-or-none',
} as const;
export type SummaryKind = ValueOf<typeof SummaryKind>;

/** The `negated` param every phrase and count message takes, for its ICU `select`. */
export const Negated = { Yes: 'yes', No: 'no' } as const;
export type Negated = ValueOf<typeof Negated>;

/**
 * When a predicate would hold, as data: the parts still unknown, with parts already known to hold left out.
 * Negation is pushed down to the phrases (each says "you use" or "you do not use"), so wording never depends on
 * where an "unless" would reach. The UI turns it into text in the viewer's locale with `formatSummary` (ADR-0009).
 */
export type PredicateSummary =
  | { readonly kind: typeof SummaryKind.Phrase; readonly message: MessageDescriptor }
  | { readonly kind: typeof SummaryKind.Authored; readonly text: ContentText }
  | { readonly kind: typeof SummaryKind.All | typeof SummaryKind.Any; readonly parts: readonly PredicateSummary[] }
  | {
      readonly kind: typeof SummaryKind.ExactlyOne | typeof SummaryKind.AllOrNone;
      readonly parts: readonly PredicateSummary[];
      readonly negated: Negated;
    };

type ListKind = typeof SummaryKind.All | typeof SummaryKind.Any;

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

function phrase(key: string, params: MessageParams): PredicateSummary {
  return { kind: SummaryKind.Phrase, message: message(key, { ...params, negated: Negated.No }) };
}

/** An option's phrase: from the vocabulary when a prefix matches, else a generic one naming the option. */
function optionPhrase(option: RollOption): PredicateSummary {
  for (let end = option.lastIndexOf(SEPARATOR); end > 0; end = option.lastIndexOf(SEPARATOR, end - 1)) {
    const key = VOCABULARY.get(option.slice(0, end));
    if (key !== undefined) {
      const slug = option.slice(end + 1);
      return phrase(key, { name: slug.replaceAll('-', '_'), slug });
    }
  }
  return phrase(PredicateMessage.Option, { option });
}

function comparisonParts(statement: PredicateComparison): readonly [string, ComparisonOperands] {
  if ('eq' in statement) {
    return [PredicateMessage.Equals, statement.eq];
  }
  if ('gt' in statement) {
    return [PredicateMessage.Greater, statement.gt];
  }
  if ('gte' in statement) {
    return [PredicateMessage.GreaterOrEqual, statement.gte];
  }
  if ('lt' in statement) {
    return [PredicateMessage.Less, statement.lt];
  }
  return [PredicateMessage.LessOrEqual, statement.lte];
}

function comparisonPhrase(statement: PredicateComparison): PredicateSummary {
  const [key, [option, value]] = comparisonParts(statement);
  return phrase(key, { option, value });
}

/** One part, or several joined by `kind`, with nested lists of the same kind flattened. Never called empty. */
function join(kind: ListKind, parts: readonly PredicateSummary[]): PredicateSummary {
  const flat = parts.flatMap((part) => (part.kind === kind ? part.parts : [part]));
  const [only] = flat;
  return flat.length === 1 && only !== undefined ? only : { kind, parts: flat };
}

const flip = (negated: Negated): Negated => (negated === Negated.Yes ? Negated.No : Negated.Yes);

function negatePhrase(descriptor: MessageDescriptor): PredicateSummary {
  const params = descriptor.params ?? {};
  const negated = params['negated'] === Negated.Yes ? Negated.Yes : Negated.No;
  return { kind: SummaryKind.Phrase, message: message(descriptor.key, { ...params, negated: flip(negated) }) };
}

/** The opposite condition, with the negation pushed down to the phrases (De Morgan for lists). */
function negate(summary: PredicateSummary): PredicateSummary {
  if (summary.kind === SummaryKind.Phrase) {
    return negatePhrase(summary.message);
  }
  if (summary.kind === SummaryKind.Authored) {
    return summary;
  }
  if ('negated' in summary) {
    return { ...summary, negated: flip(summary.negated) };
  }
  const opposite = summary.kind === SummaryKind.All ? SummaryKind.Any : SummaryKind.All;
  return join(
    opposite,
    summary.parts.map((part) => negate(part)),
  );
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

/** `xor`: once one child holds the rest must not; with a single unknown child left, that child decides. */
function summariseExactlyOne(children: Verdicts): PredicateSummary {
  if (children.truths.includes(Truth.True)) {
    return negate(join(SummaryKind.Any, children.unknown));
  }
  const [only] = children.unknown;
  if (children.unknown.length === 1 && only !== undefined) {
    return only;
  }
  return { kind: SummaryKind.ExactlyOne, parts: children.unknown, negated: Negated.No };
}

/** `iff`: once one child is known, the unknown ones must match it. */
function summariseAllOrNone(children: Verdicts): PredicateSummary {
  if (children.truths.includes(Truth.True)) {
    return join(SummaryKind.All, children.unknown);
  }
  if (children.truths.includes(Truth.False)) {
    return negate(join(SummaryKind.Any, children.unknown));
  }
  return { kind: SummaryKind.AllOrNone, parts: children.unknown, negated: Negated.No };
}

/** `if a then b`, which holds when `a` does not or `b` does. */
function summariseConditional(children: Verdicts): PredicateSummary {
  const [condition, consequence] = children.truths;
  const [first, second] = children.unknown;
  if (condition === Truth.Unknown && consequence === Truth.Unknown && first !== undefined && second !== undefined) {
    return join(SummaryKind.Any, [negate(first), second]);
  }
  if (condition === Truth.Unknown && first !== undefined) {
    return negate(first);
  }
  return join(SummaryKind.All, children.unknown);
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
  return 'xor' in statement ? summariseExactlyOne(children) : summariseAllOrNone(children);
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
