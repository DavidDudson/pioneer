import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { Modifier, RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { levelPotency } from './level-potency';
import type { ModifierInputs } from './rule-in-play';
import { inPlay } from './testing';

/** A potency `FlatModifier` of `value` on `selector` from `fromLevel` level, with the character at `level`. */
function inputs(selector: string, level: number, fromLevel: number): ModifierInputs {
  return {
    rules: [
      inPlay(
        {
          key: 'FlatModifier',
          selectors: [selector],
          type: 'potency',
          value: 2,
          predicate: [{ gte: ['self:level', fromLevel] }],
        },
        'potency',
      ),
    ],
    facts: new PredicateFacts([RollOption.parse(`self:level:${level}`)], CORE_NAMESPACES),
  };
}

describe('levelPotency', () => {
  test('is the potency bonus on Strike attack rolls that holds at the level', () => {
    expect(levelPotency(inputs('strike-attack-roll', 10, 10))).toBe(Modifier.parse(2));
  });

  test('is zero below the level, and for another selector', () => {
    expect(levelPotency(inputs('strike-attack-roll', 9, 10))).toBe(Modifier.parse(0));
    expect(levelPotency(inputs('ac', 10, 10))).toBe(Modifier.parse(0));
  });

  test('takes the highest of the bonuses that hold, not their sum', () => {
    const [low] = inputs('strike-attack-roll', 12, 2).rules;
    const [high] = inputs('strike-attack-roll', 12, 10).rules;

    expect(
      levelPotency({ ...inputs('strike-attack-roll', 12, 2), rules: [low, high].flatMap((rule) => rule ?? []) }),
    ).toBe(Modifier.parse(2));
  });

  test('ignores a modifier of another type', () => {
    const rules: ModifierInputs = {
      rules: [inPlay({ key: 'FlatModifier', selectors: ['strike-attack-roll'], type: 'item', value: 3 }, 'item-bonus')],
      facts: new PredicateFacts([], CORE_NAMESPACES),
    };

    expect(levelPotency(rules)).toBe(Modifier.parse(0));
  });
});
