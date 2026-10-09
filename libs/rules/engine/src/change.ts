import type { FormulaValue } from '@pioneer/rules/formula';
import { summarisePredicate, Truth } from '@pioneer/rules/predicate';
import { ChangeMode, OriginHopKind, RuleElementKey } from '@pioneer/rules/sdk';
import type {
  ChangeElement,
  ContentText,
  Level,
  Origin,
  Predicate,
  RulePriority,
  RuleValue,
  Selector,
} from '@pioneer/rules/sdk';

import { InactiveReason, OverridePhase, OverrideStatusKind } from './breakdown';
import type { ModifierLabel, OverrideLine, OverrideStatus } from './breakdown';
import { DEFAULT_PRIORITY, labelOf } from './modifier';
import { ruleIdOf } from './rule-in-play';
import type { RuleId, RuleInPlay } from './rule-in-play';
import { changed, truthOf, valueOf } from './rule-value';
import type { RuleContext } from './rule-value';

/** A `Change` in play on one statistic. */
export interface ChangeSource {
  readonly id: RuleId;
  readonly label: ModifierLabel;
  readonly origin: Origin;
  readonly selector: Selector;
  readonly mode: ChangeMode;
  readonly value: RuleValue;
  readonly predicate: Predicate | undefined;
  readonly summary: ContentText | undefined;
  readonly priority: RulePriority;
  readonly itemLevel: Level | undefined;
}

/** The `Change`s in play by selector: those for the base phase, and set overrides for the total. */
export interface ChangeRules {
  readonly base: ReadonlyMap<Selector, readonly ChangeSource[]>;
  readonly set: ReadonlyMap<Selector, readonly ChangeSource[]>;
}

/** Foundry's order for `Change` modes: add, multiply, upgrade, downgrade, override. */
const MODE_ORDER: readonly ChangeMode[] = [
  ChangeMode.Add,
  ChangeMode.Multiply,
  ChangeMode.Upgrade,
  ChangeMode.Downgrade,
  ChangeMode.Override,
];

function changeSource(rule: RuleInPlay, element: ChangeElement): ChangeSource {
  return {
    id: ruleIdOf(rule),
    label: labelOf(rule),
    origin: rule.origin,
    selector: element.selector,
    mode: element.mode,
    value: element.value,
    predicate: element.predicate,
    summary: element.display?.summary,
    priority: element.priority ?? DEFAULT_PRIORITY,
    itemLevel: rule.itemLevel,
  };
}

/** A set override: a `Change` that overrides, put on the character by hand (an `override` origin hop). */
function isSetOverride(source: ChangeSource): boolean {
  return source.mode === ChangeMode.Override && source.origin.hops.some(({ kind }) => kind === OriginHopKind.Override);
}

function bySelector(sources: readonly ChangeSource[]): ReadonlyMap<Selector, readonly ChangeSource[]> {
  const grouped = new Map<Selector, ChangeSource[]>();
  for (const source of sources) {
    grouped.set(source.selector, [...(grouped.get(source.selector) ?? []), source]);
  }
  return grouped;
}

/**
 * The `Change`s among the rules, by selector. Base changes run in mode order (add, multiply, upgrade, downgrade,
 * override), then priority, then id; set overrides in priority order, then id, so the last one wins.
 */
export function changeRules(rules: readonly RuleInPlay[]): ChangeRules {
  const sources = rules.flatMap((rule) =>
    rule.element.key === RuleElementKey.Change ? [changeSource(rule, rule.element)] : [],
  );
  const base = sources
    .filter((source) => !isSetOverride(source))
    .toSorted(
      (left, right) =>
        MODE_ORDER.indexOf(left.mode) - MODE_ORDER.indexOf(right.mode) ||
        left.priority - right.priority ||
        (left.id < right.id ? -1 : 1),
    );
  const set = sources
    .filter((source) => isSetOverride(source))
    .toSorted((left, right) => left.priority - right.priority || (left.id < right.id ? -1 : 1));
  return { base: bySelector(base), set: bySelector(set) };
}

/** Whether a change applies: undefined when its predicate holds, or the status that says why it does not. */
function gate(source: ChangeSource, context: RuleContext): OverrideStatus | undefined {
  const truth = truthOf(source.predicate, context.facts);
  if (truth === Truth.True || source.predicate === undefined) {
    return undefined;
  }
  return truth === Truth.False
    ? { kind: OverrideStatusKind.Inactive, reason: InactiveReason.Predicate }
    : {
        kind: OverrideStatusKind.Conditional,
        summary: summarisePredicate(source.predicate, context.facts, source.summary),
      };
}

/** A change about to act on `current` in `phase`. */
interface Acting {
  readonly source: ChangeSource;
  readonly current: FormulaValue;
  readonly phase: OverridePhase;
}

/** The line for one change acting on `current`, in `phase`; `result` is `current` unless it applied. */
function lineFor({ source, current, phase }: Acting, context: RuleContext): OverrideLine {
  const { id, label, origin, mode } = source;
  const common = { id, label, origin, phase, mode, replaced: current };
  const blocked = gate(source, context);
  const outcome = valueOf(source.value, context.resolve(source.itemLevel));
  if (!outcome.ok) {
    const failure = { kind: OverrideStatusKind.Failed, error: outcome.error, position: outcome.position } as const;
    return { ...common, value: undefined, result: current, status: blocked ?? failure };
  }
  return blocked === undefined
    ? {
        ...common,
        value: outcome.value,
        result: changed(mode, current, outcome.value),
        status: { kind: OverrideStatusKind.Applied },
      }
    : { ...common, value: outcome.value, result: current, status: blocked };
}

/** A value and the override lines that led to it. */
export interface Overridden {
  readonly value: FormulaValue;
  readonly lines: readonly OverrideLine[];
}

/**
 * The base phase's changes on one statistic, each acting on the value the one before left. A change whose
 * predicate does not hold, depends on the situation, or whose formula fails leaves the value as it was.
 */
export function applyChanges(start: FormulaValue, changes: readonly ChangeSource[], context: RuleContext): Overridden {
  let value = start;
  const lines: OverrideLine[] = [];
  for (const source of changes) {
    const line = lineFor({ source, current: value, phase: OverridePhase.Base }, context);
    lines.push(line);
    value = line.result;
  }
  return { value, lines };
}

/** A set override that applied but lost to a later one: it leaves the total as computed. */
function replaced(line: OverrideLine, computed: FormulaValue, by: RuleId): OverrideLine {
  return { ...line, result: computed, status: { kind: OverrideStatusKind.Replaced, by } };
}

/** The total and the set override lines, with the one that pins it, if any. */
export interface Pinned extends Overridden {
  readonly pinnedBy: RuleId | undefined;
}

/**
 * Set overrides on one statistic's total. The last one that applies, by priority and then id, pins the total;
 * the others that applied are listed as replaced by it. The computed total stays in each line's `replaced`.
 */
export function pinTotal(computed: FormulaValue, sets: readonly ChangeSource[], context: RuleContext): Pinned {
  const lines = sets.map((source) => lineFor({ source, current: computed, phase: OverridePhase.Total }, context));
  const winner = lines.findLast((line) => line.status.kind === OverrideStatusKind.Applied);
  if (winner === undefined) {
    return { value: computed, lines, pinnedBy: undefined };
  }
  return {
    value: winner.result,
    lines: lines.map((line) =>
      line.status.kind === OverrideStatusKind.Applied && line !== winner ? replaced(line, computed, winner.id) : line,
    ),
    pinnedBy: winner.id,
  };
}
