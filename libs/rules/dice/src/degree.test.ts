import { describe, expect, test } from 'bun:test';

import { Dc, DegreeChange, DegreeOfSuccess } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { checkOutcome, degreeOfSuccess, DegreeStepKind, naturalD20 } from './degree';
import type { CheckOutcome, DegreeAdjustment, DegreeResult } from './degree';
import { DiceMessage } from './messages';
import { parseDiceExpression } from './parse';
import { rollDice } from './roll';
import type { RollResult } from './roll';
import { scriptedRandom } from './testing';
import { DiceExpressionText, DieFace, RollTotal } from './units';

const DC_20 = Dc.parse(20);
const INCISIVE = message('effect.incisive');
const CLUMSY = message('effect.clumsy');

function check(total: number, natural?: number): CheckOutcome {
  return { total: RollTotal.parse(total), natural: natural === undefined ? undefined : DieFace.parse(natural) };
}

function roll(text: string, faces: readonly number[]): RollResult {
  const outcome = parseDiceExpression(DiceExpressionText.parse(text));
  if (!outcome.ok) {
    throw new Error(outcome.error.key);
  }
  return rollDice(outcome.expression, scriptedRandom(faces.map((face) => DieFace.parse(face))));
}

function degrees(result: DegreeResult): readonly DegreeOfSuccess[] {
  return result.steps.map((step) => step.degree);
}

describe('degreeOfSuccess', () => {
  test.each([
    [30, DegreeOfSuccess.CriticalSuccess, DiceMessage.DegreeBaseCriticalSuccess],
    [29, DegreeOfSuccess.Success, DiceMessage.DegreeBaseSuccess],
    [20, DegreeOfSuccess.Success, DiceMessage.DegreeBaseSuccess],
    [19, DegreeOfSuccess.Failure, DiceMessage.DegreeBaseFailure],
    [11, DegreeOfSuccess.Failure, DiceMessage.DegreeBaseFailure],
    [10, DegreeOfSuccess.CriticalFailure, DiceMessage.DegreeBaseCriticalFailure],
  ])('total %d against DC 20 is %s', (total, degree, key) => {
    const result = degreeOfSuccess(check(total), DC_20);
    expect(result.degree).toBe(degree);
    expect(result.steps).toEqual([{ kind: DegreeStepKind.Base, degree, reason: message(key, { total, dc: 20 }) }]);
    expect(result.natural).toBeUndefined();
  });

  test('a natural 20 steps one degree better after the comparison', () => {
    const result = degreeOfSuccess(check(19, 20), DC_20);
    expect(result.degree).toBe(DegreeOfSuccess.Success);
    expect(result.natural).toBe(DieFace.parse(20));
    expect(result.steps[1]).toEqual({
      kind: DegreeStepKind.Natural,
      degree: DegreeOfSuccess.Success,
      reason: message(DiceMessage.DegreeNatural20),
    });
  });

  test('a natural 1 steps one degree worse after the comparison', () => {
    const result = degreeOfSuccess(check(30, 1), DC_20);
    expect(degrees(result)).toEqual([DegreeOfSuccess.CriticalSuccess, DegreeOfSuccess.Success]);
    expect(result.steps[1]?.reason).toEqual(message(DiceMessage.DegreeNatural1));
  });

  test('a natural step clamps at the ends and still shows', () => {
    const best = degreeOfSuccess(check(35, 20), DC_20);
    const worst = degreeOfSuccess(check(5, 1), DC_20);
    expect(degrees(best)).toEqual([DegreeOfSuccess.CriticalSuccess, DegreeOfSuccess.CriticalSuccess]);
    expect(degrees(worst)).toEqual([DegreeOfSuccess.CriticalFailure, DegreeOfSuccess.CriticalFailure]);
  });

  test('other natural faces do not step', () => {
    expect(degreeOfSuccess(check(20, 13), DC_20).steps).toHaveLength(1);
  });

  test('an adjustment is matched against the degree after the natural step', () => {
    const adjustments: DegreeAdjustment[] = [
      { appliesTo: DegreeOfSuccess.Failure, change: DegreeChange.ToSuccess, reason: INCISIVE },
    ];
    // Ten below the DC is a critical failure; the natural 20 makes it a failure, which the adjustment matches.
    const result = degreeOfSuccess(check(10, 20), DC_20, adjustments);
    expect(result.degree).toBe(DegreeOfSuccess.Success);
    expect(result.steps.map((step) => step.kind)).toEqual([
      DegreeStepKind.Base,
      DegreeStepKind.Natural,
      DegreeStepKind.Adjustment,
    ]);
    expect(result.steps[2]).toEqual({
      kind: DegreeStepKind.Adjustment,
      degree: DegreeOfSuccess.Success,
      reason: INCISIVE,
    });
  });

  test('only one adjustment applies, so they do not chain', () => {
    const result = degreeOfSuccess(check(15), DC_20, [
      { appliesTo: DegreeOfSuccess.Failure, change: DegreeChange.ToSuccess, reason: INCISIVE },
      { appliesTo: DegreeOfSuccess.Success, change: DegreeChange.ToCriticalSuccess, reason: CLUMSY },
    ]);
    expect(result.degree).toBe(DegreeOfSuccess.Success);
    expect(result.steps).toHaveLength(2);
  });

  test('an any-degree adjustment wins over one for the degree, as in Foundry', () => {
    const result = degreeOfSuccess(check(20), DC_20, [
      { appliesTo: DegreeOfSuccess.Success, change: DegreeChange.ToCriticalSuccess, reason: INCISIVE },
      { change: DegreeChange.OneDegreeWorse, reason: CLUMSY },
    ]);
    expect(result.degree).toBe(DegreeOfSuccess.Failure);
    expect(result.steps[1]?.reason).toEqual(CLUMSY);
  });

  test('a one-degree move that the end of the ladder would swallow is passed over', () => {
    const result = degreeOfSuccess(check(30), DC_20, [
      { change: DegreeChange.OneDegreeBetter, reason: INCISIVE },
      { appliesTo: DegreeOfSuccess.CriticalSuccess, change: DegreeChange.ToSuccess, reason: CLUMSY },
    ]);
    expect(result.degree).toBe(DegreeOfSuccess.Success);
    expect(result.steps[1]?.reason).toEqual(CLUMSY);
  });

  test('an adjustment for another degree does not apply', () => {
    const result = degreeOfSuccess(check(22), DC_20, [
      { appliesTo: DegreeOfSuccess.Failure, change: DegreeChange.ToSuccess, reason: INCISIVE },
    ]);
    expect(result.steps).toHaveLength(1);
  });

  test('a matching adjustment sets the degree and gives its reason', () => {
    const result = degreeOfSuccess(check(22), DC_20, [
      { appliesTo: DegreeOfSuccess.Success, change: DegreeChange.ToCriticalSuccess, reason: INCISIVE },
    ]);
    expect(result.degree).toBe(DegreeOfSuccess.CriticalSuccess);
    expect(result.steps[1]).toEqual({
      kind: DegreeStepKind.Adjustment,
      degree: DegreeOfSuccess.CriticalSuccess,
      reason: INCISIVE,
    });
  });

  test.each([
    [DegreeChange.OneDegreeBetter, DegreeOfSuccess.CriticalSuccess],
    [DegreeChange.OneDegreeWorse, DegreeOfSuccess.Failure],
    [DegreeChange.TwoDegreesBetter, DegreeOfSuccess.CriticalSuccess],
    [DegreeChange.TwoDegreesWorse, DegreeOfSuccess.CriticalFailure],
    [DegreeChange.ToCriticalSuccess, DegreeOfSuccess.CriticalSuccess],
    [DegreeChange.ToSuccess, DegreeOfSuccess.Success],
    [DegreeChange.ToFailure, DegreeOfSuccess.Failure],
    [DegreeChange.ToCriticalFailure, DegreeOfSuccess.CriticalFailure],
  ])('%s turns a success into %s', (change, degree) => {
    expect(degreeOfSuccess(check(20), DC_20, [{ change, reason: INCISIVE }]).degree).toBe(degree);
  });
});

describe('naturalD20', () => {
  test('is the face of a check’s single d20', () => {
    expect(naturalD20(roll('1d20+7', [17]))).toBe(DieFace.parse(17));
  });

  test('is the kept die when a keep rule leaves one d20', () => {
    expect(naturalD20(roll('2d20kh1+3', [4, 20]))).toBe(DieFace.parse(20));
  });

  test('is unset without exactly one kept d20 adding to the total', () => {
    expect(naturalD20(roll('2d6+4', [3, 3]))).toBeUndefined();
    expect(naturalD20(roll('2d20+1', [3, 9]))).toBeUndefined();
    expect(naturalD20(roll('1d20+1d20', [3, 9]))).toBeUndefined();
    expect(naturalD20(roll('10-1d20', [3]))).toBeUndefined();
  });

  test('checkOutcome pairs the total with the natural d20', () => {
    expect(checkOutcome(roll('1d20+7', [20]))).toEqual(check(27, 20));
  });
});
