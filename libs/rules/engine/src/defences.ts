import type { ResolveReference, TextPosition } from '@pioneer/rules/formula';
import { summarisePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateSummary } from '@pioneer/rules/predicate';
import { DamageAmount, RuleElementKey } from '@pioneer/rules/sdk';
import type {
  DamageAdjustmentTarget,
  DamageException,
  Immunity,
  ImmunityElement,
  Origin,
  Predicate,
  ProficiencyBonusTable,
  ResistanceElement,
  RuleNumber,
  WeaknessElement,
} from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import type { ModifierLabel } from './breakdown';
import type { StatisticContent } from './derive-statistics';
import { EngineMessage } from './messages';
import { labelOf } from './modifier';
import { proficiencyBonuses } from './proficiency-bonuses';
import { itemScopeOf, NO_MODIFIERS, ruleIdOf } from './rule-in-play';
import type { ItemScope, ModifierInputs, RuleId, RuleInPlay } from './rule-in-play';
import { truthOf, valueOf, whole } from './rule-value';
import type { RuleContext } from './rule-value';
import { resolverFor } from './statistic-inputs';
import type { StatisticInputs } from './statistic-inputs';

export const DefenceStatusKind = {
  Applied: 'applied',
  Superseded: 'superseded',
  Conditional: 'conditional',
  Failed: 'failed',
} as const;
export type DefenceStatusKind = ValueOf<typeof DefenceStatusKind>;

export type DefenceStatus =
  | { readonly kind: typeof DefenceStatusKind.Applied }
  /** A higher unconditional weakness or resistance to the same type or group counts instead. */
  | { readonly kind: typeof DefenceStatusKind.Superseded; readonly by: RuleId }
  /** The predicate depends on facts the sheet does not know; `summary` words when it would hold. */
  | {
      readonly kind: typeof DefenceStatusKind.Conditional;
      readonly when: Predicate;
      readonly summary: PredicateSummary | undefined;
    }
  /** The value's formula failed to evaluate, or gave more than a weakness or resistance can be. */
  | {
      readonly kind: typeof DefenceStatusKind.Failed;
      readonly error: MessageDescriptor;
      /** Where in the failing formula; undefined when the value was out of range. */
      readonly position: TextPosition | undefined;
      /** The predicate of a conditional defence, kept so the sheet still says when it would apply. */
      readonly when: Predicate | undefined;
    };

/** One immunity from an `Immunity` element: applied, or conditional on the situation. */
export interface ImmunityLine {
  readonly id: RuleId;
  readonly label: ModifierLabel;
  readonly origin: Origin;
  readonly type: Immunity;
  readonly status: DefenceStatus;
}

/** One weakness or resistance from a `Weakness` or `Resistance` element, and whether it counts. */
export interface AdjustmentLine {
  readonly id: RuleId;
  readonly label: ModifierLabel;
  readonly origin: Origin;
  readonly type: DamageAdjustmentTarget;
  /** Undefined only when the line failed. */
  readonly value: DamageAmount | undefined;
  readonly exceptions: readonly DamageException[];
  readonly status: DefenceStatus;
}

/**
 * A character's immunities, weaknesses and resistances (rules-engine.md, "Defences"), each line in type order, then
 * id order. A defence whose predicate is false is left out.
 */
export interface Defences {
  readonly immunities: readonly ImmunityLine[];
  readonly weaknesses: readonly AdjustmentLine[];
  readonly resistances: readonly AdjustmentLine[];
}

/** The most a weakness or resistance can be: `DamageAmount`'s bound. */
const DEFENCE_MAX = DamageAmount.parse(32_767);
const NONE: readonly DamageException[] = [];

/** How a predicate gates a defence: dropped when false, applied when true, conditional when unknown. */
function gate(rule: RuleInPlay, context: RuleContext): DefenceStatus | undefined {
  const { predicate, display } = rule.element;
  const truth = truthOf(predicate, context.facts);
  if (truth === Truth.False) {
    return undefined;
  }
  if (truth === Truth.True || predicate === undefined) {
    return { kind: DefenceStatusKind.Applied };
  }
  return {
    kind: DefenceStatusKind.Conditional,
    when: predicate,
    summary: summarisePredicate(predicate, context.facts, display?.summary),
  };
}

/** A weakness's or resistance's value and the status it leaves; undefined when it comes to nothing (0 or less). */
interface Valued {
  readonly value: DamageAmount | undefined;
  readonly status: DefenceStatus;
}

/** A failed line's status, keeping the predicate of a conditional one. */
function failed(gated: DefenceStatus, error: MessageDescriptor, position: TextPosition | undefined): DefenceStatus {
  const when = gated.kind === DefenceStatusKind.Conditional ? gated.when : undefined;
  return { kind: DefenceStatusKind.Failed, error, position, when };
}

/** A value as a `DamageAmount`: nothing when 0 or less, failed past its bound. */
function amountOf(value: RuleNumber, status: DefenceStatus): Valued | undefined {
  const rounded = whole(value);
  if (rounded !== undefined && rounded <= 0) {
    return undefined;
  }
  const amount = DamageAmount.safeParse(rounded);
  if (amount.success) {
    return { value: amount.data, status };
  }
  const error = message(EngineMessage.DefenceOutOfRange, { maximum: DEFENCE_MAX });
  return { value: undefined, status: failed(status, error, undefined) };
}

function valued(
  rule: RuleInPlay,
  element: WeaknessElement | ResistanceElement,
  context: RuleContext,
): Valued | undefined {
  const status = gate(rule, context);
  if (status === undefined) {
    return undefined;
  }
  const outcome = valueOf(element.value, context.resolve(itemScopeOf(rule)));
  if (!outcome.ok) {
    return { value: undefined, status: failed(status, outcome.error, outcome.position) };
  }
  return amountOf(outcome.value, status);
}

/** Lines in type order, then id order, so the result never depends on the order of the rules. */
function inOrder<Line extends ImmunityLine | AdjustmentLine>(lines: readonly Line[]): readonly Line[] {
  return lines.toSorted((left, right) => {
    const type = Number(left.type > right.type) - Number(left.type < right.type);
    return type === 0 ? Number(left.id > right.id) - Number(left.id < right.id) : type;
  });
}

/**
 * Per type or group, the highest applied line counts and the other applied ones are superseded by it; ties go to
 * the lowest id, as the lines are in id order. Conditional and failed lines are kept as they are, since a
 * conditional one may beat it when it applies.
 */
function highestPerType(lines: readonly AdjustmentLine[]): readonly AdjustmentLine[] {
  const winners = new Map<DamageAdjustmentTarget, AdjustmentLine>();
  for (const line of lines) {
    const best = winners.get(line.type);
    const { value } = line;
    if (line.status.kind === DefenceStatusKind.Applied && value !== undefined && (best?.value ?? 0) < value) {
      winners.set(line.type, line);
    }
  }
  return lines.map((line) => {
    const winner = winners.get(line.type);
    if (line.status.kind !== DefenceStatusKind.Applied || winner === undefined || winner === line) {
      return line;
    }
    return { ...line, status: { kind: DefenceStatusKind.Superseded, by: winner.id } };
  });
}

/** The lines one `Immunity` element gives: one per type it names, a repeated type once. */
function immunityLines(rule: RuleInPlay, element: ImmunityElement, context: RuleContext): readonly ImmunityLine[] {
  const status = gate(rule, context);
  if (status === undefined) {
    return [];
  }
  const id = ruleIdOf(rule);
  const label = labelOf(rule);
  return [...new Set(element.type)].map((type) => ({ id, label, origin: rule.origin, type, status }));
}

/** The lines one `Weakness` or `Resistance` element gives: one per type or group it names, a repeated one once. */
function adjustmentLines(
  rule: RuleInPlay,
  element: WeaknessElement | ResistanceElement,
  context: RuleContext,
): readonly AdjustmentLine[] {
  const result = valued(rule, element, context);
  if (result === undefined) {
    return [];
  }
  const id = ruleIdOf(rule);
  const label = labelOf(rule);
  const exceptions = element.exceptions ?? NONE;
  const { value, status } = result;
  return [...new Set(element.type)].map((type) => ({
    id,
    label,
    origin: rule.origin,
    type,
    value,
    exceptions,
    status,
  }));
}

/** What defence formulas read: the character's inputs and the item's level, never other statistics. */
function defenceContext(
  proficiencyBonus: ProficiencyBonusTable,
  inputs: StatisticInputs,
  modifiers: ModifierInputs,
): RuleContext {
  const { rules, facts } = modifiers;
  const values = { inputs, proficiency: proficiencyBonuses(proficiencyBonus, { rules, facts, level: inputs.level }) };
  return {
    facts,
    resolve: (item: ItemScope): ResolveReference => resolverFor(values, (): undefined => undefined, { item }),
  };
}

/**
 * Turns the `Immunity`, `Weakness` and `Resistance` elements in play into the character's defences (rules-engine.md,
 * "Defences"). A predicate that holds applies a defence, one that fails drops it, and one that depends on the
 * situation makes it conditional. Weaknesses and resistances do not stack: per type or group the highest applied one
 * counts and the rest are superseded. Their value formulas read the character's inputs and the level of the item they
 * are on, not other statistics, as a `Change`'s do; a value of 0 or less comes to nothing and is left out. Never
 * throws, and the result does not depend on the order of the rules.
 */
export function deriveDefences(
  { proficiencyBonus }: StatisticContent,
  inputs: StatisticInputs,
  modifiers: ModifierInputs = NO_MODIFIERS,
): Defences {
  const context = defenceContext(proficiencyBonus, inputs, modifiers);
  const immunities: ImmunityLine[] = [];
  const weaknesses: AdjustmentLine[] = [];
  const resistances: AdjustmentLine[] = [];
  for (const rule of modifiers.rules) {
    const { element } = rule;
    if (element.key === RuleElementKey.Immunity) {
      immunities.push(...immunityLines(rule, element, context));
    } else if (element.key === RuleElementKey.Weakness) {
      weaknesses.push(...adjustmentLines(rule, element, context));
    } else if (element.key === RuleElementKey.Resistance) {
      resistances.push(...adjustmentLines(rule, element, context));
    }
  }
  return {
    immunities: inOrder(immunities),
    weaknesses: highestPerType(inOrder(weaknesses)),
    resistances: highestPerType(inOrder(resistances)),
  };
}
