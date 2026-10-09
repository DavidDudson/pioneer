import { describe, expect, test } from 'bun:test';

import { DamageType, Immunity } from '@pioneer/rules/sdk';
import { assert, boolean, constantFrom, nat, property, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { applyDamage } from './damage';
import type { DamageApplication, DamageOptions, DamageTarget } from './damage';
import { DiceExpression } from './expression';
import { rollDice } from './roll';
import type { RollResult } from './roll';
import { RandomSeed, seededRandom } from './testing';
import { damageAdjustment, damageTarget, expression } from './testing/arbitraries';

const IMMUNE_TO_EVERYTHING = Object.values(DamageType).map((type) => Immunity.parse(type));
const anyType = constantFrom(...Object.values(DamageType));

/** An expression with a type on every term, so nothing is left untyped. */
const typedExpression = expression.chain((parsed) =>
  anyType.map((type) =>
    DiceExpression.parse({
      terms: parsed.terms.map((term) => ({ ...term, tags: { ...term.tags, type: term.tags.type ?? type } })),
    }),
  ),
);

/** A rolled damage expression, a target, and whether the hit was critical. */
interface Hit {
  readonly roll: RollResult;
  readonly target: DamageTarget;
  readonly options: DamageOptions;
}

function hitOf(rolls: Arbitrary<DiceExpression>): Arbitrary<Hit> {
  return record({ parsed: rolls, seed: nat(), target: damageTarget, critical: boolean() }).map(
    ({ parsed, seed, target, critical }) => ({
      roll: rollDice(parsed, seededRandom(RandomSeed.parse(seed))),
      target,
      options: { critical },
    }),
  );
}

const hit = hitOf(expression);
const typedHit = hitOf(typedExpression);

/** Everything taken: now, and per turn from persistent damage. */
function takenOf(result: DamageApplication): readonly number[] {
  return [result.taken, result.persistentTaken];
}

function dealtOf(result: DamageApplication): number {
  let total = 0;
  for (const instance of [...result.immediate, ...result.persistent]) {
    total += instance.dealt;
  }
  return total;
}

describe('damage application (properties)', () => {
  test('damage taken is never negative, per instance or in total', () => {
    assert(
      property(hit, ({ roll, target, options }) => {
        const result = applyDamage(roll, target, options);
        for (const instance of [...result.immediate, ...result.persistent]) {
          expect(instance.taken).toBeGreaterThanOrEqual(0);
        }
        expect(Math.min(...takenOf(result))).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  test('immunity to every damage type takes nothing from typed damage', () => {
    assert(
      property(typedHit, ({ roll, target, options }) => {
        const immune = { ...target, immunities: IMMUNE_TO_EVERYTHING };
        const result = applyDamage(roll, immune, options);
        expect(takenOf(result)).toEqual([0, 0]);
      }),
    );
  });

  test('adding a resistance never increases damage taken', () => {
    assert(
      property(hit, damageAdjustment, ({ roll, target, options }, extra) => {
        const before = takenOf(applyDamage(roll, target, options));
        const resistant = { ...target, resistances: [...target.resistances, extra] };
        const after = takenOf(applyDamage(roll, resistant, options));
        for (const [index, value] of after.entries()) {
          expect(value).toBeLessThanOrEqual(before[index] ?? 0);
        }
      }),
    );
  });

  test('adding a weakness never decreases damage taken', () => {
    assert(
      property(hit, damageAdjustment, ({ roll, target, options }, extra) => {
        const before = takenOf(applyDamage(roll, target, options));
        const weak = { ...target, weaknesses: [...target.weaknesses, extra] };
        const after = takenOf(applyDamage(roll, weak, options));
        for (const [index, value] of after.entries()) {
          expect(value).toBeGreaterThanOrEqual(before[index] ?? 0);
        }
      }),
    );
  });

  test('a critical never deals less than a normal hit', () => {
    assert(
      property(hit, ({ roll, target }) => {
        const normal = applyDamage(roll, target);
        const critical = applyDamage(roll, target, { critical: true });
        expect(dealtOf(critical)).toBeGreaterThanOrEqual(dealtOf(normal));
      }),
    );
  });
});
