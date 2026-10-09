import { describe, expect, test } from 'bun:test';

import { Dc, DegreeOfSuccess } from '@pioneer/rules/sdk';
import { assert, constantFrom, integer, oneof, option, property, tuple } from 'fast-check';

import { degreeOfSuccess, DegreeStepKind } from './degree';
import { DieFace, RollTotal } from './units';

const LADDER: readonly DegreeOfSuccess[] = [
  DegreeOfSuccess.CriticalFailure,
  DegreeOfSuccess.Failure,
  DegreeOfSuccess.Success,
  DegreeOfSuccess.CriticalSuccess,
];
const rank = (degree: DegreeOfSuccess): number => LADDER.indexOf(degree);

const dc = integer({ min: 0, max: 60 }).map((value) => Dc.parse(value));
const total = integer({ min: -20, max: 80 });
const anyFace = integer({ min: 1, max: 20 }).map((value) => DieFace.parse(value));
const naturals = constantFrom(DieFace.parse(1), DieFace.parse(20));
/** Naturals 1 and 20 weighted up so the clamped steps at both ends come up in every run. */
const face = option(oneof({ arbitrary: naturals, weight: 3 }, { arbitrary: anyFace, weight: 1 }), { nil: undefined });

/** Degrees a natural die moves the result: up for a 20, down for a 1. */
function naturalShift(natural: DieFace | undefined): number {
  if (natural === DieFace.parse(20)) {
    return 1;
  }
  return natural === DieFace.parse(1) ? -1 : 0;
}

describe('degree of success (properties)', () => {
  test('for a fixed die face, a higher total never gives a worse degree', () => {
    assert(
      property(dc, tuple(total, total), face, (against, [first, second], natural) => {
        const [low, high] = first <= second ? [first, second] : [second, first];
        const lower = degreeOfSuccess({ total: RollTotal.parse(low), natural }, against);
        const higher = degreeOfSuccess({ total: RollTotal.parse(high), natural }, against);
        expect(rank(higher.degree)).toBeGreaterThanOrEqual(rank(lower.degree));
      }),
    );
  });

  test('a natural 20 or 1 shifts exactly one degree, clamped at the ends; other faces do not', () => {
    assert(
      property(dc, total, face, (against, value, natural) => {
        const result = degreeOfSuccess({ total: RollTotal.parse(value), natural }, against);
        const base = rank(result.steps[0]?.degree ?? DegreeOfSuccess.Failure);
        const shift = naturalShift(natural);
        const expected = Math.min(Math.max(base + shift, 0), LADDER.length - 1);
        expect(rank(result.degree)).toBe(expected);
        expect(result.steps.some((step) => step.kind === DegreeStepKind.Natural)).toBe(shift !== 0);
      }),
    );
  });

  test('the base step is critical exactly when the total is 10 or more from the DC', () => {
    assert(
      property(dc, total, constantFrom(undefined), (against, value, natural) => {
        const { degree } = degreeOfSuccess({ total: RollTotal.parse(value), natural }, against);
        const critical = degree === DegreeOfSuccess.CriticalSuccess || degree === DegreeOfSuccess.CriticalFailure;
        expect(critical).toBe(Math.abs(value - against) >= 10);
      }),
    );
  });
});
