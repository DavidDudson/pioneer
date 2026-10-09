import { describe, expect, test } from 'bun:test';

import { array, assert, constantFrom, nat, property, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { RollMode, rollWithFortune } from './fortune';
import type { FortuneSources } from './fortune';
import { rollDice } from './roll';
import { RandomSeed, seededRandom } from './testing';
import { expression, expressionBounds } from './testing/arbitraries';
import { RollTotal } from './units';

/** Up to three named effects of each kind; only whether a kind is present changes the roll. */
const effects = array(record({ key: constantFrom('effect.a', 'effect.b') }), { maxLength: 3 });
const sources: Arbitrary<FortuneSources> = record({ fortune: effects, misfortune: effects });

describe('fortune and misfortune (properties)', () => {
  test('fortune keeps the higher of two rolls, misfortune the lower', () => {
    assert(
      property(expression, sources, nat(), (parsed, effectsOn, seed) => {
        const fortuned = rollWithFortune(parsed, effectsOn, seededRandom(RandomSeed.parse(seed)));
        const totals = fortuned.rolls.map((entry) => entry.result.total);
        if (fortuned.mode === RollMode.Fortune) {
          expect(fortuned.total).toBe(RollTotal.parse(Math.max(...totals)));
        }
        if (fortuned.mode === RollMode.Misfortune) {
          expect(fortuned.total).toBe(RollTotal.parse(Math.min(...totals)));
        }
        const kept = fortuned.rolls.filter((entry) => entry.kept);
        expect(kept).toHaveLength(1);
        expect(kept[0]?.result.total).toBe(fortuned.total);
      }),
    );
  });

  test('never more than two rolls, and two only when one kind is present without the other', () => {
    assert(
      property(expression, sources, nat(), (parsed, effectsOn, seed) => {
        const fortuned = rollWithFortune(parsed, effectsOn, seededRandom(RandomSeed.parse(seed)));
        const oneSided = effectsOn.fortune.length > 0 !== effectsOn.misfortune.length > 0;
        expect(fortuned.rolls).toHaveLength(oneSided ? 2 : 1);
      }),
    );
  });

  test('fortune with misfortune is the same as a single normal roll', () => {
    assert(
      property(expression, nat(), (parsed, seed) => {
        const both: FortuneSources = { fortune: [{ key: 'effect.a' }], misfortune: [{ key: 'effect.b' }] };
        const cancelled = rollWithFortune(parsed, both, seededRandom(RandomSeed.parse(seed)));
        const single = rollDice(parsed, seededRandom(RandomSeed.parse(seed)));
        expect(cancelled.mode).toBe(RollMode.Cancelled);
        expect(cancelled.rolls).toEqual([{ result: single, kept: true }]);
        expect(cancelled.total).toBe(single.total);
      }),
    );
  });

  test('the kept total stays within the expression bounds', () => {
    assert(
      property(expression, sources, nat(), (parsed, effectsOn, seed) => {
        const fortuned = rollWithFortune(parsed, effectsOn, seededRandom(RandomSeed.parse(seed)));
        const { min, max } = expressionBounds(parsed);
        expect(fortuned.total).toBeGreaterThanOrEqual(min);
        expect(fortuned.total).toBeLessThanOrEqual(max);
      }),
    );
  });
});
