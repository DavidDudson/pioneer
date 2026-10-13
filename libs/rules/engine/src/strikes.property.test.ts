import { describe, expect, test } from 'bun:test';

import { array, assert, boolean, constantFrom, integer, property } from 'fast-check';

import type { WeaponInputs } from './source-inputs';
import { damageDice, multipleAttackPenalty } from './strikes';
import { wielded } from './testing';

const TRAITS = ['agile', 'finesse', 'thrown-10', 'reach', 'versatile-p'] as const;
const STRIKING_MAX = 4;
const DICE_MAX = 4;
const RUNS = 200;

/** A branded number as the plain one a test compares. */
function plain(value: number | undefined): number | undefined {
  return value;
}

function weapon(traits: readonly string[], dice: number, striking: number | undefined): WeaponInputs {
  return wielded({
    slug: 'sword',
    category: 'martial',
    traits,
    striking,
    damage: { dice, die: 'd8', damageType: 'slashing' },
  }) as unknown as WeaponInputs;
}

const TRAIT_SETS = array(constantFrom(...TRAITS), { maxLength: 4 });

describe('multiple attack penalty, by property', () => {
  test('an agile weapon is always 1 and 2 better than any other, and each is worse than the last', () => {
    assert(
      property(TRAIT_SETS, (traits) => {
        const { second, third } = multipleAttackPenalty(weapon(traits, 1, undefined));
        const agile = traits.includes('agile');
        expect(plain(second)).toBe(agile ? -4 : -5);
        expect(plain(third)).toBe(agile ? -8 : -10);
        expect(plain(third)).toBeLessThan(second);
      }),
      { numRuns: RUNS },
    );
  });
});

describe('Strike dice, by property', () => {
  test('a striking rune adds exactly its grade to a weapon that rolls a die', () => {
    assert(
      property(
        integer({ min: 1, max: DICE_MAX }),
        integer({ min: 1, max: STRIKING_MAX }),
        boolean(),
        (dice, grade, runed) => {
          const rolled = damageDice(weapon([], dice, runed ? grade : undefined));
          expect(plain(rolled)).toBe(runed ? dice + grade : dice);
        },
      ),
      { numRuns: RUNS },
    );
  });
});
