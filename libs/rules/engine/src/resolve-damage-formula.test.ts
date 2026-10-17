import { describe, expect, test } from 'bun:test';

import { DiceExpressionText, parseDiceExpression } from '@pioneer/rules/dice';
import { DamageFormula } from '@pioneer/rules/sdk';

import { resolveDamageFormula } from './resolve-damage-formula';
import { StatisticInputsJson } from './statistic-inputs';

const INPUTS = StatisticInputsJson.parse({
  level: 3,
  attributes: { str: 3, dex: -1, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});

function resolved(text: string): unknown {
  return resolveDamageFormula(DamageFormula.parse(text), INPUTS);
}

function dice(text: string): unknown {
  const parsed = parseDiceExpression(DiceExpressionText.parse(text));
  return { ok: true, expression: parsed.ok ? parsed.expression : undefined };
}

describe('resolveDamageFormula', () => {
  test('plain dice are unchanged', () => {
    expect(resolved('1d8')).toEqual(dice('1d8'));
  });

  test('an attribute modifier is read from the character', () => {
    expect(resolved('1d8 + @attr.str')).toEqual(dice('1d8+3'));
  });

  test('a negative modifier turns the sign', () => {
    expect(resolved('1d8 + @attr.dex')).toEqual(dice('1d8-1'));
    expect(resolved('1d8 - @attr.dex')).toEqual(dice('1d8+1'));
  });

  test('a reference in the dice count is read', () => {
    expect(resolved('(@level)d6')).toEqual(dice('3d6'));
  });

  test('a reference with no value is the unresolved text', () => {
    expect(resolved('1d8 + @ancestry.hp')).toEqual({ ok: false, unresolved: '@ancestry.hp' });
  });
});
