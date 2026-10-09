import { FormulaValue } from '@pioneer/rules/formula';
import { summarisePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { Domain } from '@pioneer/rules/sdk';
import type { ModifierTarget, Predicate, StatisticDefinition } from '@pioneer/rules/sdk';

import { InactiveReason, LineStatusKind, SuppressionReason } from './breakdown';
import type { BreakdownLine, LineStatus } from './breakdown';
import { EngineMessage } from './messages';
import type { Adjustment, ModifierRules, ModifierSource } from './modifier';
import type { RuleId } from './rule-in-play';
import { changed, outOfRange, truthOf, valueOf } from './rule-value';
import type { RuleContext, ValueFailure } from './rule-value';
import { stack } from './stacking';

/** The domain every statistic belongs to. */
const ALL = Domain.parse('all');

/** Whether any of `targets` reaches the statistic: its selector, one of its domains, or `all`. */
function reaches(targets: readonly ModifierTarget[], definition: StatisticDefinition): boolean {
  const reached: ReadonlySet<string> = new Set([definition.selector, ALL, ...definition.domains]);
  return targets.some((target) => reached.has(target));
}

/** An adjustment whose result left the safe integer range; a number has no formula position to point at. */
const OUT_OF_RANGE: LineStatus = {
  kind: LineStatusKind.Failed,
  error: outOfRange(EngineMessage.AdjustmentOutOfRange),
  position: undefined,
};

function failed({ error, position }: ValueFailure): LineStatus {
  return { kind: LineStatusKind.Failed, error, position };
}

/** One adjustment's effect: the new value, or the status that ends the line there (suppressed or failed). */
type Step =
  | { readonly value: FormulaValue }
  | { readonly value: FormulaValue | undefined; readonly status: LineStatus };

/** Collects, adjusts, gates and stacks the modifiers that reach one statistic. */
class Collection {
  readonly #context: RuleContext;
  readonly #adjustments: readonly Adjustment[];

  public constructor(context: RuleContext, adjustments: readonly Adjustment[]) {
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
    if (!outcome.ok) {
      return { value: undefined, status: failed(outcome) };
    }
    const result = changed(change.mode, value, outcome.value);
    return result === undefined ? { value: undefined, status: OUT_OF_RANGE } : { value: result };
  }

  /** Applied when the predicate holds, inactive when it does not, conditional while it depends on the situation. */
  #gate({ modifier, summary }: ModifierSource): LineStatus {
    const { predicate } = modifier;
    const truth = truthOf(predicate, this.#context.facts);
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
  return truthOf(predicate, facts) === Truth.True;
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
  context: RuleContext,
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
