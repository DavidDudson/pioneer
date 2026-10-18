import { describe, expect, test } from 'bun:test';

import { entry, feat, idOf, lookupOf } from '@pioneer/rules/grants/testing';
import { array, assert, boolean, property } from 'fast-check';

import { exclusiveEffects, isPolymorph } from './effect-exclusivity';
import { ActiveEffectSchema, EffectInstanceId } from './effects';
import type { ActiveEffect } from './effects';

const LOOKUP = lookupOf([
  feat('wild-shape', ['trait:polymorph', 'trait:primal']),
  feat('dragon-form', ['trait:polymorph']),
  entry('heroism'),
]);

const INSTANCE_RADIX = 16;
const INSTANCE_WIDTH = 12;

function applied(slug: string, index: number): ActiveEffect {
  const suffix = index.toString(INSTANCE_RADIX).padStart(INSTANCE_WIDTH, '0');
  return ActiveEffectSchema.parse({
    id: EffectInstanceId.parse(`00000000-0000-4000-8000-${suffix}`),
    effect: idOf(slug),
  });
}

describe('exclusiveEffects', () => {
  test('a lone polymorph effect stays', () => {
    const wild = applied('wild-shape', 1);
    expect(exclusiveEffects([wild], LOOKUP)).toStrictEqual({ active: [wild], replaced: [] });
  });

  test('the newest polymorph effect replaces the one before and reports it', () => {
    const wild = applied('wild-shape', 1);
    const dragon = applied('dragon-form', 2);
    expect(exclusiveEffects([wild, dragon], LOOKUP)).toStrictEqual({ active: [dragon], replaced: [wild] });
  });

  test('applying the same polymorph effect again replaces the earlier instance', () => {
    const first = applied('wild-shape', 1);
    const second = applied('wild-shape', 2);
    expect(exclusiveEffects([first, second], LOOKUP)).toStrictEqual({ active: [second], replaced: [first] });
  });

  test('effects without the trait are untouched, and keep their place', () => {
    const wild = applied('wild-shape', 1);
    const boon = applied('heroism', 2);
    const dragon = applied('dragon-form', 3);
    expect(exclusiveEffects([wild, boon, dragon], LOOKUP)).toStrictEqual({
      active: [boon, dragon],
      replaced: [wild],
    });
  });

  test('an effect the content lacks is not a polymorph', () => {
    expect(isPolymorph(LOOKUP, applied('missing', 1))).toBe(false);
  });
});

describe('exclusiveEffects properties', () => {
  const sequences = array(boolean(), { maxLength: 40 }).map((flags) =>
    flags.map((polymorph, index) => applied(polymorph ? 'wild-shape' : 'heroism', index)),
  );

  test('at most one polymorph effect is active for any sequence of applications', () => {
    assert(
      property(sequences, (effects) => {
        const { active } = exclusiveEffects(effects, LOOKUP);
        expect(active.filter((each) => isPolymorph(LOOKUP, each)).length).toBeLessThanOrEqual(1);
      }),
    );
  });

  test('the newest wins, every other polymorph effect is replaced and the rest stay', () => {
    assert(
      property(sequences, (effects) => {
        const polymorphs = effects.filter((each) => isPolymorph(LOOKUP, each));
        const { active, replaced } = exclusiveEffects(effects, LOOKUP);
        expect(replaced).toStrictEqual(polymorphs.slice(0, -1));
        expect([...active, ...replaced]).toHaveLength(effects.length);
        expect(active.filter((each) => isPolymorph(LOOKUP, each))).toStrictEqual(polymorphs.slice(-1));
      }),
    );
  });
});
