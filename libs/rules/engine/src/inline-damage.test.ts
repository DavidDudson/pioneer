import { describe, expect, test } from 'bun:test';

import { FormulaText } from '@pioneer/rules/formula';
import { DamageFormula, DamageType, InlineKind } from '@pioneer/rules/sdk';
import type { DamageNode } from '@pioneer/rules/sdk';

import { resolveDamageNode } from './inline-damage';
import { StatisticInputsJson } from './statistic-inputs';

const INPUTS = StatisticInputsJson.parse({
  level: 3,
  attributes: { str: 3, dex: -1, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});

function damage(...instances: DamageNode['instances']): DamageNode {
  return { type: InlineKind.Damage, instances };
}

function tagsOf(node: DamageNode, inputs: typeof INPUTS | undefined = INPUTS): unknown {
  const resolved = resolveDamageNode(node, inputs);
  return resolved.ok ? resolved.expression.terms.map(({ tags }) => tags) : resolved;
}

describe('resolveDamageNode', () => {
  test('tags every term of an instance with its type and category', () => {
    const node = damage(
      { formula: DamageFormula.parse('2d6+1'), damageType: DamageType.Fire },
      { formula: DamageFormula.parse('1d6'), damageType: DamageType.Fire, category: 'persistent' },
    );
    expect(tagsOf(node)).toEqual([{ type: 'fire' }, { type: 'fire' }, { type: 'fire', category: 'persistent' }]);
  });

  test('leaves untyped damage untyped', () => {
    const node = damage({ formula: DamageFormula.parse('1d4') });
    expect(tagsOf(node)).toEqual([{}]);
  });

  test('reads a reference from the character', () => {
    const resolved = resolveDamageNode(damage({ formula: DamageFormula.parse('1d8 + @attr.str') }), INPUTS);
    expect(resolved.ok).toBe(true);
  });

  test('without a character, a formula that reads one is returned as text', () => {
    const resolved = resolveDamageNode(damage({ formula: DamageFormula.parse('1d8 + @attr.str') }), undefined);
    expect(resolved).toEqual({ ok: false, unresolved: FormulaText.parse('1d8 + @attr.str') });
  });

  test('without a character, plain dice still roll', () => {
    const node = damage({ formula: DamageFormula.parse('2d6'), damageType: DamageType.Cold });
    expect(tagsOf(node, undefined)).toEqual([{ type: 'cold' }]);
  });
});
