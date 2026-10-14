import { DegreeStepKind, DiceExpressionText, formatExpression, formatTerm, RollMode, Sign } from '@pioneer/rules/dice';
import type {
  DamageApplication,
  DamageInstance,
  DamageTotal,
  DegreeResult,
  DiceExpression,
  DieResult,
  FortunedRoll,
  FortuneRollEntry,
  RollTotal,
  TermResult,
} from '@pioneer/rules/dice';
import type { DegreeOfSuccess } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { DAMAGE_CATEGORY_KEYS, DAMAGE_TYPE_KEYS, DEGREE_KEYS, UNTYPED_DAMAGE_KEY } from './roll-labels';

/** One term of a roll as shown: signed notation, damage labels, dice and its share of the total. */
interface TermView {
  readonly notation: DiceExpressionText;
  /** Message keys for the term's damage category and type, in that order. */
  readonly damageKeys: readonly string[];
  readonly dice: readonly DieResult[];
  readonly value: RollTotal;
}

/** One roll of the expression; fortune and misfortune make two, and only one is kept. */
export interface AttemptView {
  readonly kept: boolean;
  readonly total: RollTotal;
  readonly terms: readonly TermView[];
}

/** One step towards the degree of success: the degree's label key after it, and why. */
interface DegreeStepView {
  readonly degreeKey: string;
  readonly reason: MessageDescriptor;
}

/** A degree an effect moved: the label keys of the degree before and after, and what moved it. */
export interface DegreeAdjustmentView {
  readonly fromKey: string;
  readonly toKey: string;
  readonly reason: MessageDescriptor;
}

/** The kept roll's degree of success against the DC, with every step that led to it. */
export interface DegreeView {
  readonly degree: DegreeOfSuccess;
  readonly degreeKey: string;
  /** Unset unless an effect (a feat, a spell) changed the degree the roll and natural die reached. */
  readonly adjustment: DegreeAdjustmentView | undefined;
  readonly steps: readonly DegreeStepView[];
}

/** One instance of damage: its type's label key, what was dealt and taken, and why they differ. */
export interface DamageInstanceView {
  readonly typeKey: string;
  readonly dealt: DamageTotal;
  readonly taken: DamageTotal;
  readonly lines: readonly MessageDescriptor[];
}

/** The kept roll applied to the target: taken now, and persistent damage taken each turn. */
export interface DamageView {
  readonly taken: DamageTotal;
  readonly persistentTaken: DamageTotal;
  readonly immediate: readonly DamageInstanceView[];
  readonly persistent: readonly DamageInstanceView[];
}

export interface RollView {
  readonly id: number;
  readonly notation: DiceExpressionText;
  readonly total: RollTotal;
  /** Why one roll or two, and which was kept; unset for a plain roll. */
  readonly explanation: MessageDescriptor | undefined;
  readonly attempts: readonly AttemptView[];
  /** Unset when the roll was not against a DC. */
  readonly degree: DegreeView | undefined;
  /** Unset when the roll was not applied to a target. */
  readonly damage: DamageView | undefined;
  /** The toggles the roll was made with, worded, so the card can say why the total is what it is; none for a plain roll. */
  readonly reasons: readonly string[];
}

function termView(result: TermResult, index: number): TermView {
  const { term } = result;
  const sign = term.sign === Sign.Minus || index > 0 ? term.sign : '';
  const damageKeys = [
    term.tags.category === undefined ? undefined : DAMAGE_CATEGORY_KEYS[term.tags.category],
    term.tags.type === undefined ? undefined : DAMAGE_TYPE_KEYS[term.tags.type],
  ].filter((key) => key !== undefined);
  return {
    notation: DiceExpressionText.parse(`${sign}${formatTerm(term)}`),
    damageKeys,
    dice: 'dice' in result ? result.dice : [],
    value: result.value,
  };
}

function attemptView(entry: FortuneRollEntry): AttemptView {
  return { kept: entry.kept, total: entry.result.total, terms: entry.result.terms.map(termView) };
}

/** The step an effect made, when it moved the degree; a clamped one leaves nothing to say. */
function adjustmentView(result: DegreeResult): DegreeAdjustmentView | undefined {
  const index = result.steps.findIndex((step) => step.kind === DegreeStepKind.Adjustment);
  const adjusted = result.steps[index];
  const before = result.steps[index - 1];
  return adjusted === undefined || before === undefined || adjusted.degree === before.degree
    ? undefined
    : { fromKey: DEGREE_KEYS[before.degree], toKey: DEGREE_KEYS[adjusted.degree], reason: adjusted.reason };
}

function degreeView(result: DegreeResult): DegreeView {
  return {
    degree: result.degree,
    degreeKey: DEGREE_KEYS[result.degree],
    adjustment: adjustmentView(result),
    steps: result.steps.map((step) => ({ degreeKey: DEGREE_KEYS[step.degree], reason: step.reason })),
  };
}

function damageInstanceView(instance: DamageInstance): DamageInstanceView {
  return {
    typeKey: instance.type === undefined ? UNTYPED_DAMAGE_KEY : DAMAGE_TYPE_KEYS[instance.type],
    dealt: instance.dealt,
    taken: instance.taken,
    lines: instance.lines,
  };
}

function damageView(result: DamageApplication): DamageView {
  return {
    taken: result.taken,
    persistentTaken: result.persistentTaken,
    immediate: result.immediate.map(damageInstanceView),
    persistent: result.persistent.map(damageInstanceView),
  };
}

/** Everything one press of Roll produced. */
export interface FinishedRoll {
  readonly expression: DiceExpression;
  readonly roll: FortunedRoll;
  /** Unset when not rolled against a DC. */
  readonly degree: DegreeResult | undefined;
  /** Unset when not applied to a target. */
  readonly damage: DamageApplication | undefined;
  /** The toggles the roll was made with, worded; none when left out. */
  readonly reasons?: readonly string[];
}

export function rollView(id: number, { expression, roll, degree, damage, reasons = [] }: FinishedRoll): RollView {
  return {
    id,
    notation: formatExpression(expression),
    total: roll.total,
    explanation: roll.mode === RollMode.Normal ? undefined : roll.explanation,
    attempts: roll.rolls.map(attemptView),
    degree: degree === undefined ? undefined : degreeView(degree),
    damage: damage === undefined ? undefined : damageView(damage),
    reasons,
  };
}
