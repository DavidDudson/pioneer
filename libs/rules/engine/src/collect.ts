import { evaluate, FormulaText, FormulaValue, parseFormula } from '@pioneer/rules/formula';
import type { ResolveReference, TextPosition } from '@pioneer/rules/formula';
import { evaluatePredicate, summarisePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { AdjustMode, Domain, RuleNumber } from '@pioneer/rules/sdk';
import type {
  Level,
  ModifierTarget,
  ModifierValue,
  Predicate,
  RuleValue,
  StatisticDefinition,
} from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { InactiveReason, LineStatusKind, SuppressionReason } from './breakdown';
import type { BreakdownLine, LineStatus } from './breakdown';
import type { Adjustment, ModifierRules, ModifierSource } from './modifier';
import type { RuleId } from './rule-in-play';
import { stack } from './stacking';

/** The domain every statistic belongs to. */
const ALL = Domain.parse('all');

/** Resolves a rule element's formula references, given the level of the item it is on. */
export type ResolveFor = (itemLevel: Level | undefined) => ResolveReference;

/** What collecting needs besides the rules: the facts predicates read and the formula references' values. */
export interface CollectContext {
  readonly facts: PredicateFacts;
  readonly resolve: ResolveFor;
}

/** Whether any of `targets` reaches the statistic: its selector, one of its domains, or `all`. */
function reaches(targets: readonly ModifierTarget[], definition: StatisticDefinition): boolean {
  const reached: ReadonlySet<string> = new Set([definition.selector, ALL, ...definition.domains]);
  return targets.some((target) => reached.has(target));
}

interface Failure {
  readonly ok: false;
  readonly error: MessageDescriptor;
  readonly position: TextPosition;
}

/** A rule element's number, or why its formula has none. */
type ValueOutcome = { readonly ok: true; readonly value: RuleNumber } | Failure;

/** A number as written, or a formula evaluated with the references' values. */
function valueOf(value: ModifierValue | RuleValue, resolve: ResolveReference): ValueOutcome {
  if (typeof value === 'number') {
    return { ok: true, value: RuleNumber.parse(value) };
  }
  const parsed = parseFormula(FormulaText.parse(value));
  if (!parsed.ok) {
    return parsed;
  }
  const outcome = evaluate(parsed.formula, resolve);
  return outcome.ok ? { ok: true, value: RuleNumber.parse(outcome.value) } : outcome;
}

function failed({ error, position }: Failure): LineStatus {
  return { kind: LineStatusKind.Failed, error, position };
}

/** A whole number from an adjustment, rounded down as PF2e rounds (`multiply` by 0.5 halves a +3 to +1). */
function adjusted(mode: AdjustMode, current: FormulaValue, change: RuleNumber): FormulaValue {
  switch (mode) {
    case AdjustMode.Add: {
      return FormulaValue.parse(Math.floor(current + change));
    }
    case AdjustMode.Subtract: {
      return FormulaValue.parse(Math.floor(current - change));
    }
    case AdjustMode.Multiply: {
      return FormulaValue.parse(Math.floor(current * change));
    }
    case AdjustMode.Upgrade: {
      return FormulaValue.parse(Math.floor(Math.max(current, change)));
    }
    case AdjustMode.Downgrade: {
      return FormulaValue.parse(Math.floor(Math.min(current, change)));
    }
    case AdjustMode.Override: {
      return FormulaValue.parse(Math.floor(change));
    }
    default: {
      return mode satisfies never;
    }
  }
}

/** One adjustment's effect: the new value, or the status that ends the line there (suppressed or failed). */
type Step =
  | { readonly value: FormulaValue }
  | { readonly value: FormulaValue | undefined; readonly status: LineStatus };

/** Collects, adjusts, gates and stacks the modifiers that reach one statistic. */
class Collection {
  readonly #context: CollectContext;
  readonly #adjustments: readonly Adjustment[];

  public constructor(context: CollectContext, adjustments: readonly Adjustment[]) {
    this.#context = context;
    this.#adjustments = adjustments;
  }

  /** The line for one modifier before stacking: applied, inactive, conditional, failed or suppressed by adjustment. */
  public line(source: ModifierSource): BreakdownLine {
    const { modifier } = source;
    const outcome = valueOf(source.value, this.#context.resolve(source.itemLevel));
    if (!outcome.ok) {
      return { modifier, value: undefined, adjustedBy: [], status: failed(outcome) };
    }
    return this.#adjust(source, FormulaValue.parse(outcome.value));
  }

  /** Runs each adjustment that finds the modifier, in order, until one suppresses it or fails. */
  #adjust(source: ModifierSource, written: FormulaValue): BreakdownLine {
    const { modifier } = source;
    let value = written;
    const adjustedBy: RuleId[] = [];
    for (const adjustment of this.#adjustments.filter(({ slug }) => slug === undefined || slug === modifier.slug)) {
      adjustedBy.push(adjustment.id);
      const step = this.#step(adjustment, value);
      if ('status' in step) {
        return { modifier, value: step.value, adjustedBy, status: step.status };
      }
      ({ value } = step);
    }
    return { modifier, value, adjustedBy, status: this.#gate(source) };
  }

  #step(adjustment: Adjustment, value: FormulaValue): Step {
    const { change } = adjustment;
    if (change.suppress) {
      return {
        value,
        status: { kind: LineStatusKind.Suppressed, by: adjustment.id, reason: SuppressionReason.Adjustment },
      };
    }
    const outcome = valueOf(change.value, this.#context.resolve(adjustment.itemLevel));
    return outcome.ok
      ? { value: adjusted(change.mode, value, outcome.value) }
      : { value: undefined, status: failed(outcome) };
  }

  /** Applied when the predicate holds, inactive when it does not, conditional while it depends on the situation. */
  #gate({ modifier, summary }: ModifierSource): LineStatus {
    const { predicate } = modifier;
    const truth = predicate === undefined ? Truth.True : evaluatePredicate(predicate, this.#context.facts);
    if (truth === Truth.True || predicate === undefined) {
      return { kind: LineStatusKind.Applied };
    }
    if (truth === Truth.False) {
      return { kind: LineStatusKind.Inactive, reason: InactiveReason.Predicate };
    }
    return {
      kind: LineStatusKind.Conditional,
      when: predicate,
      summary: summarisePredicate(predicate, this.#context.facts, summary),
    };
  }
}

/** Whether an adjustment's predicate is known to hold; one that depends on the situation does not run. */
function holds(predicate: Predicate | undefined, facts: PredicateFacts): boolean {
  return predicate === undefined || evaluatePredicate(predicate, facts) === Truth.True;
}

/**
 * Every modifier that reaches the statistic through its selector, its domains or `all`, as breakdown lines in id
 * order. Adjustments that reach it and hold run in priority order, then id order. Each line is then gated by its
 * predicate (Kleene: true applies, false is inactive, unknown is conditional) and the applied ones are stacked.
 * A formula that fails to evaluate makes its line failed, never an exception.
 */
export function collectLines(
  definition: StatisticDefinition,
  rules: ModifierRules,
  context: CollectContext,
): readonly BreakdownLine[] {
  const adjustments = rules.adjustments
    .filter((adjustment) => reaches(adjustment.targets, definition) && holds(adjustment.predicate, context.facts))
    .toSorted((left, right) => left.priority - right.priority || (left.id < right.id ? -1 : 1));
  const collection = new Collection(context, adjustments);
  const lines = rules.modifiers
    .filter(({ modifier }) => reaches(modifier.targets, definition))
    .toSorted((left, right) => (left.modifier.id < right.modifier.id ? -1 : 1))
    .map((source) => collection.line(source));
  return stack(lines);
}
