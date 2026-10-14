import { describe, expect, test } from 'bun:test';

import { ContentId, RuleElementKey } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

function translated(raw: object): RuleTranslation {
  return translateRules(ENTRY, [raw], { lang: {}, values: { item: '' } });
}

describe('CreatureSize from Foundry', () => {
  test('a size, its reach and the gear that resizes with it carry over', () => {
    const { rules, untranslated } = translated({
      key: 'CreatureSize',
      reach: { override: 0 },
      resizeEquipment: true,
      value: 'tiny',
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      { key: RuleElementKey.CreatureSize, reach: { override: 0 }, resizeEquipment: true, value: 'tiny' },
    ]);
  });

  test('Foundry size codes become Pioneer sizes, in the value and the maximum', () => {
    const { rules, untranslated } = translated({
      key: 'CreatureSize',
      maximumSize: 'lg',
      predicate: ['terrain:full-moon'],
      reach: { add: 5 },
      value: 1,
    });

    expect(untranslated).toEqual([]);
    expect(rules).toMatchObject([{ maximumSize: 'large', value: 1, reach: { add: 5 } }]);
  });

  test.each([
    ['sm', 'small'],
    ['med', 'medium'],
    ['grg', 'gargantuan'],
  ])('the code %s is %s', (code, size) => {
    const { rules } = translated({ key: 'CreatureSize', value: code });

    expect(rules).toMatchObject([{ value: size }]);
  });

  test('a size read from a pick is kept for the backlog', () => {
    const { rules, untranslated } = translated({
      key: 'CreatureSize',
      reach: { override: '{item|flags.system.rulesSelections.enlarge.reach}' },
      resizeEquipment: true,
      value: '{item|flags.system.rulesSelections.enlarge.size}',
    });

    expect(rules).toEqual([]);
    expect(untranslated).toHaveLength(1);
  });
});

describe('ActorTraits from Foundry', () => {
  test('traits added carry over with their predicate', () => {
    const { rules, untranslated } = translated({ add: ['plant'], key: 'ActorTraits', predicate: ['self:level'] });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      { key: RuleElementKey.ActorTraits, add: ['plant'], predicate: ['self:level'] },
    ]);
  });

  test('a predicate that compares with the item level is kept for the backlog', () => {
    const { untranslated } = translated({
      add: ['minion'],
      key: 'ActorTraits',
      predicate: [{ gte: ['{item|level}', 'self:level'] }],
    });

    expect(untranslated).toHaveLength(1);
  });
});
