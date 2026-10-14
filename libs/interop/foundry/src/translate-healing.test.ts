import { describe, expect, test } from 'bun:test';

import { ContentId, RuleElementKey } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

function translated(raw: object): RuleTranslation {
  return translateRules(ENTRY, [raw], { lang: {}, values: { item: '' } });
}

describe('FastHealing from Foundry', () => {
  test('a number and a formula of the item level carry over', () => {
    const { rules, untranslated } = translated({ key: 'FastHealing', value: '@item.level * 2' });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([{ key: RuleElementKey.FastHealing, value: '@item.level * 2' }]);
  });

  test('regeneration and what deactivates it carry over', () => {
    const { rules, untranslated } = translated({
      key: 'FastHealing',
      type: 'regeneration',
      deactivatedBy: ['acid', 'fire'],
      value: 15,
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      { key: RuleElementKey.FastHealing, type: 'regeneration', deactivatedBy: ['acid', 'fire'], value: 15 },
    ]);
  });

  test('a ternary value is kept in Pioneer formula spelling', () => {
    const { untranslated } = translated({ key: 'FastHealing', value: 'ternary(gte(@item.level,9),20,15)' });

    expect(untranslated).toEqual([]);
  });
});

describe('TempHP from Foundry', () => {
  test.each([8, '@actor.level', '@item.level*5', '@actor.system.abilities.con.mod + @actor.level'])(
    'a value of %j carries over',
    (value) => {
      const { rules, untranslated } = translated({ key: 'TempHP', value });

      expect(untranslated).toEqual([]);
      expect(rules).toHaveLength(1);
    },
  );

  test('a value read from a pick is kept for the backlog', () => {
    const { rules, untranslated } = translated({
      key: 'TempHP',
      value: '2*@item.flags.system.rulesSelections.rank',
    });

    expect(rules).toEqual([]);
    expect(untranslated).toHaveLength(1);
  });
});
