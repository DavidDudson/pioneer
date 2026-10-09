import { Dc, DegreeChange, DegreeChangeSchema, DegreeOfSuccess, DegreeOfSuccessSchema } from '@pioneer/rules/sdk';
import { message, MessageDescriptorSchema } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { Sign, TermKind } from './expression';
import { DiceMessage } from './messages';
import type { RollResult } from './roll';
import { DieFace, DieSize, RollTotal } from './units';

/**
 * One `AdjustDegreeOfSuccess` effect as the check sees it: which degree it changes (any when unset),
 * how, and what grants it, so the log can say why the degree moved.
 */
export const DegreeAdjustment = z.object({
  appliesTo: DegreeOfSuccessSchema.optional(),
  change: DegreeChangeSchema,
  reason: MessageDescriptorSchema,
});
export type DegreeAdjustment = z.infer<typeof DegreeAdjustment>;

/** What moved the degree: comparing the total with the DC, the natural die, or an adjustment. */
export const DegreeStepKind = { Base: 'base', Natural: 'natural', Adjustment: 'adjustment' } as const;
export type DegreeStepKind = ValueOf<typeof DegreeStepKind>;
export const DegreeStepKindSchema = z.enum(DegreeStepKind);

/** One step towards the final degree: the degree after it, and why. A clamped step keeps the degree. */
export const DegreeStep = z.object({
  kind: DegreeStepKindSchema,
  degree: DegreeOfSuccessSchema,
  reason: MessageDescriptorSchema,
});
export type DegreeStep = z.infer<typeof DegreeStep>;

/**
 * A check's degree of success with every step taken to reach it (base comparison, natural die, each
 * adjustment that applied, in order), so a log can explain the outcome.
 */
export const DegreeResult = z.object({
  dc: Dc,
  total: RollTotal,
  natural: DieFace.optional(),
  degree: DegreeOfSuccessSchema,
  steps: z.array(DegreeStep).min(1),
});
export type DegreeResult = z.infer<typeof DegreeResult>;

/** The parts of a rolled check that decide its degree. */
export interface CheckOutcome {
  readonly total: RollTotal;
  /** The d20's face, when the check has exactly one kept d20. */
  readonly natural: DieFace | undefined;
}

const D20 = DieSize.parse(20);
const NATURAL_20 = DieFace.parse(20);
const NATURAL_1 = DieFace.parse(1);
/** Beating the DC by this much, or missing it by this much, makes the result critical. */
const CRITICAL_MARGIN = RollTotal.parse(10);

/** Degrees worst first, so a step is a move along the ladder. */
const LADDER: readonly DegreeOfSuccess[] = [
  DegreeOfSuccess.CriticalFailure,
  DegreeOfSuccess.Failure,
  DegreeOfSuccess.Success,
  DegreeOfSuccess.CriticalSuccess,
];

const BETTER = 1;
const WORSE = -1;
type Direction = typeof BETTER | typeof WORSE;

const BASE_KEYS: Readonly<Record<DegreeOfSuccess, string>> = {
  [DegreeOfSuccess.CriticalSuccess]: DiceMessage.DegreeBaseCriticalSuccess,
  [DegreeOfSuccess.Success]: DiceMessage.DegreeBaseSuccess,
  [DegreeOfSuccess.Failure]: DiceMessage.DegreeBaseFailure,
  [DegreeOfSuccess.CriticalFailure]: DiceMessage.DegreeBaseCriticalFailure,
};

/** Moves one degree along the ladder, staying at the ends. */
function step(degree: DegreeOfSuccess, direction: Direction): DegreeOfSuccess {
  const index = LADDER.indexOf(degree) + direction;
  return LADDER[Math.min(Math.max(index, 0), LADDER.length - 1)] ?? degree;
}

const TARGETS: Readonly<Record<DegreeChange, DegreeOfSuccess | undefined>> = {
  [DegreeChange.OneDegreeBetter]: undefined,
  [DegreeChange.OneDegreeWorse]: undefined,
  [DegreeChange.ToCriticalSuccess]: DegreeOfSuccess.CriticalSuccess,
  [DegreeChange.ToSuccess]: DegreeOfSuccess.Success,
  [DegreeChange.ToFailure]: DegreeOfSuccess.Failure,
  [DegreeChange.ToCriticalFailure]: DegreeOfSuccess.CriticalFailure,
};

function applyChange(degree: DegreeOfSuccess, change: DegreeChange): DegreeOfSuccess {
  if (change === DegreeChange.OneDegreeBetter) {
    return step(degree, BETTER);
  }
  if (change === DegreeChange.OneDegreeWorse) {
    return step(degree, WORSE);
  }
  return TARGETS[change] ?? degree;
}

function baseDegree(total: RollTotal, dc: Dc): DegreeOfSuccess {
  if (total >= dc + CRITICAL_MARGIN) {
    return DegreeOfSuccess.CriticalSuccess;
  }
  if (total >= dc) {
    return DegreeOfSuccess.Success;
  }
  return total <= dc - CRITICAL_MARGIN ? DegreeOfSuccess.CriticalFailure : DegreeOfSuccess.Failure;
}

function naturalStep(degree: DegreeOfSuccess, natural: DieFace | undefined): DegreeStep | undefined {
  if (natural === NATURAL_20) {
    return { kind: DegreeStepKind.Natural, degree: step(degree, BETTER), reason: message(DiceMessage.DegreeNatural20) };
  }
  if (natural === NATURAL_1) {
    return { kind: DegreeStepKind.Natural, degree: step(degree, WORSE), reason: message(DiceMessage.DegreeNatural1) };
  }
  return undefined;
}

/**
 * The degree of success of `check` against `dc`: beat it by 10 or more for a critical success, meet it
 * for a success, miss it for a failure, miss by 10 or more for a critical failure. A natural 20 then
 * steps one degree better and a natural 1 one worse, and `adjustments` apply last, in order, each to
 * the degree the previous steps left.
 */
export function degreeOfSuccess(
  check: CheckOutcome,
  dc: Dc,
  adjustments: readonly DegreeAdjustment[] = [],
): DegreeResult {
  const base = baseDegree(check.total, dc);
  const steps: DegreeStep[] = [
    { kind: DegreeStepKind.Base, degree: base, reason: message(BASE_KEYS[base], { total: check.total, dc }) },
  ];
  const natural = naturalStep(base, check.natural);
  if (natural !== undefined) {
    steps.push(natural);
  }
  let degree = natural?.degree ?? base;
  for (const adjustment of adjustments) {
    if (adjustment.appliesTo === undefined || adjustment.appliesTo === degree) {
      degree = applyChange(degree, adjustment.change);
      steps.push({ kind: DegreeStepKind.Adjustment, degree, reason: adjustment.reason });
    }
  }
  const result: DegreeResult = { dc, total: check.total, degree, steps };
  return check.natural === undefined ? result : { ...result, natural: check.natural };
}

/**
 * The natural d20 of a check roll: the face of its one kept d20, when it has exactly one and it adds
 * to the total. Anything else (no d20, several, or a subtracted one) has no natural die to step on.
 */
export function naturalD20(roll: RollResult): DieFace | undefined {
  const faces: DieFace[] = [];
  for (const result of roll.terms) {
    if (result.term.kind === TermKind.Dice && result.term.size === D20 && 'dice' in result) {
      const kept = result.dice.filter((die) => die.kept);
      if (result.term.sign === Sign.Minus && kept.length > 0) {
        return undefined;
      }
      faces.push(...kept.map((die) => die.face));
    }
  }
  return faces.length === 1 ? faces[0] : undefined;
}

/** A rolled check's total and natural d20, ready for `degreeOfSuccess`. */
export function checkOutcome(roll: RollResult): CheckOutcome {
  return { total: roll.total, natural: naturalD20(roll) };
}
