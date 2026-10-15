import { describe, test } from 'bun:test';

import { RandomSeed, seededRandom } from '@pioneer/rules/dice/testing';
import { ContentId, DamageFormula, DamageType, HitPoints, NO_DEFENCES } from '@pioneer/rules/sdk';
import { array, assert, boolean, constantFrom, integer, property, record } from 'fast-check';

import { ConditionDurationKind, ConditionInstanceId } from './conditions';
import type { ActiveCondition } from './conditions';
import { currentHitPoints, FRESH_PLAY } from './play-state';
import { within } from './testing';
import { endTurn } from './turn-end';

const MAX = HitPoints.parse(40);
const RUNS = 200;
const SEED_MAX = 1000;
const CONDITIONS_MAX = 5;
const DAMAGE_MAX = 40;
const TEMP_MAX = 10;
const ID_DIGITS = 12;
const BURNING = ContentId.parse('00000000-0000-4000-8000-0000000000c1');
const FORMULAS = ['1d4', '2d6', '1d8+3', '3d10'].map((text) => DamageFormula.parse(text));
const LIMITS = within(MAX);

const shapes = array(
  record({
    formula: constantFrom(...FORMULAS),
    type: constantFrom(DamageType.Fire, DamageType.Bleed, DamageType.Poison, DamageType.Acid),
    assisted: boolean(),
  }),
  { maxLength: CONDITIONS_MAX },
);

const scenario = record({
  persistents: shapes,
  damage: integer({ min: 0, max: DAMAGE_MAX }),
  temp: integer({ min: 0, max: TEMP_MAX }),
  seed: integer({ min: 0, max: SEED_MAX }),
});

function conditionAt(index: number, persistent: ActiveCondition['persistent']): ActiveCondition {
  return {
    id: ConditionInstanceId.parse(`00000000-0000-4000-8000-${String(index).padStart(ID_DIGITS, '0')}`),
    condition: BURNING,
    duration: { kind: ConditionDurationKind.Unlimited },
    persistent,
  };
}

describe('endTurn properties', () => {
  test('persistent damage never heals: Hit Points and temporary Hit Points only go down, and conditions only go', () => {
    assert(
      property(scenario, ({ persistents, damage, temp, seed }) => {
        const conditions = persistents.map((each, index) => conditionAt(index, each));
        const hp = { damage: HitPoints.parse(damage), temp: HitPoints.parse(temp) };
        const before = { ...FRESH_PLAY, hp, conditions };
        const inputs = { limits: LIMITS, defences: NO_DEFENCES, recovery: new Map() };
        const { play } = endTurn(before, inputs, seededRandom(RandomSeed.parse(seed)));
        const lower = currentHitPoints(play.hp, MAX) <= currentHitPoints(hp, MAX);
        const kept = play.conditions.every(({ id }) => conditions.some((each) => each.id === id));
        return lower && play.hp.temp <= hp.temp && kept;
      }),
      { numRuns: RUNS },
    );
  });
});
