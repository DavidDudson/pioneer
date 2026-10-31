import { describe, expect, test } from 'bun:test';

import { ContentId, RuleElementKey } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

describe('ChoiceSet from Foundry: a pick of values other rules read', () => {
  const DAMAGE = {
    choices: [
      { label: 'PF2E.TraitAcid', value: 'acid' },
      { label: 'PF2E.TraitCold', value: 'cold' },
      { label: 'PF2E.TraitFire', value: 'fire' },
    ],
    flag: 'damageType',
    key: RuleElementKey.ChoiceSet,
  };
  const lang = { PF2E: { TraitAcid: 'Acid', TraitCold: 'Cold', TraitFire: 'Fire' } };

  function resisted(rules: readonly object[]): RuleTranslation {
    return translateRules(ENTRY, [DAMAGE, ...rules], { lang, values: { item: 'Conduct Energy' } });
  }

  test('the pick sets a roll option and each reader is made for each value, switched on by it', () => {
    const { rules, untranslated } = resisted([
      { key: 'Resistance', type: '{item|flags.system.rulesSelections.damageType}', value: 5 },
    ]);

    expect(untranslated).toEqual([]);
    expect((rules[0] as { rollOption: string }).rollOption).toBe('conduct-energy-damage-type');
    expect(rules.slice(1) as readonly unknown[]).toEqual([
      { key: 'Resistance', type: ['acid'], value: 5, predicate: ['conduct-energy-damage-type:acid'] },
      { key: 'Resistance', type: ['cold'], value: 5, predicate: ['conduct-energy-damage-type:cold'] },
      { key: 'Resistance', type: ['fire'], value: 5, predicate: ['conduct-energy-damage-type:fire'] },
    ]);
  });

  test('a rule that reads the pick otherwise leaves the pick and its readers in the backlog', () => {
    const reader = {
      key: 'ActiveEffectLike',
      path: 'system.x',
      value: '{item|flags.system.rulesSelections.damageType}',
    };
    const { rules, untranslated } = resisted([
      { key: 'Resistance', type: '{item|flags.system.rulesSelections.damageType}', value: 5 },
      reader,
    ]);

    expect(rules).toEqual([]);
    expect(untranslated.map(({ key }) => key)).toContain(RuleElementKey.ChoiceSet);
  });
});
