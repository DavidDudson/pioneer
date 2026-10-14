import { describe, expect, test } from 'bun:test';

import { ContentId, RuleElementKey } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

function translated(raw: object): RuleTranslation {
  return translateRules(ENTRY, [raw], { lang: {}, values: { item: 'Hunter’s Edge' } });
}

describe('DamageDice from Foundry', () => {
  test('dice of a size, with a category and a predicate', () => {
    const { rules, untranslated } = translated({
      category: 'precision',
      diceNumber: 1,
      dieSize: 'd6',
      hideIfDisabled: true,
      key: RuleElementKey.DamageDice,
      predicate: ['self:condition:undetected'],
      selector: 'strike-damage',
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        category: 'precision',
        diceNumber: 1,
        dieSize: 'd6',
        key: RuleElementKey.DamageDice,
        predicate: ['self:condition:undetected'],
        selectors: ['strike-damage'],
      },
    ]);
  });

  test('a formula for the number of dice is in Pioneer spelling', () => {
    const { rules, untranslated } = translated({
      diceNumber: 'ternary(gte(@actor.level,18),2,1)',
      key: RuleElementKey.DamageDice,
      selector: 'melee-strike-damage',
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        diceNumber: 'ternary(gte(@level, 18), 2, 1)',
        key: RuleElementKey.DamageDice,
        selectors: ['melee-strike-damage'],
      },
    ]);
  });

  test('an override of the damage type, a critical-only die and a label', () => {
    const override = translated({
      key: RuleElementKey.DamageDice,
      override: { damageType: 'bludgeoning' },
      predicate: ['dazing-blow'],
      selector: 'strike-damage',
    });
    const critical = translated({
      critical: true,
      damageType: 'bleed',
      diceNumber: 1,
      dieSize: 'd4',
      key: RuleElementKey.DamageDice,
      label: 'Bleeding Claws',
      selector: 'claw-damage',
    });

    expect(override.untranslated).toEqual([]);
    expect(critical.rules as readonly unknown[]).toEqual([
      {
        critical: true,
        damageType: 'bleed',
        diceNumber: 1,
        display: { label: 'Bleeding Claws' },
        dieSize: 'd4',
        key: RuleElementKey.DamageDice,
        selectors: ['claw-damage'],
      },
    ]);
  });

  test('a selector built from the item and a damage type picked by a ChoiceSet stay', () => {
    const own = translated({
      diceNumber: 1,
      dieSize: 'd6',
      key: RuleElementKey.DamageDice,
      selector: '{item|id}-damage',
    });
    const picked = translated({
      damageType: '{item|flags.system.rulesSelections.element}',
      diceNumber: 1,
      dieSize: 'd6',
      key: RuleElementKey.DamageDice,
      selector: 'strike-damage',
    });

    expect([own, picked].map(({ untranslated }) => untranslated.length)).toEqual([1, 1]);
  });
});

describe('DamageAlteration from Foundry', () => {
  test('an alteration of the number of dice, and an override of the type', () => {
    const number = translated({
      key: RuleElementKey.DamageAlteration,
      mode: 'add',
      predicate: ['palatine-strike'],
      property: 'dice-number',
      selectors: ['strike-damage'],
      slug: 'strategic-strike',
      value: 2,
    });
    const type = translated({
      key: RuleElementKey.DamageAlteration,
      mode: 'override',
      property: 'damage-type',
      selectors: ['strike-damage'],
      value: 'spirit',
    });

    expect([number, type].map(({ untranslated }) => untranslated)).toEqual([[], []]);
    expect(number.rules as readonly unknown[]).toEqual([
      {
        key: RuleElementKey.DamageAlteration,
        mode: 'add',
        predicate: ['option:palatine-strike'],
        property: 'dice-number',
        selectors: ['strike-damage'],
        slug: 'strategic-strike',
        value: 2,
      },
    ]);
  });

  test('a selector built from the item stays', () => {
    const { untranslated } = translated({
      key: RuleElementKey.DamageAlteration,
      mode: 'override',
      property: 'damage-type',
      selectors: ['{item|flags.system.rulesSelections.weapon}-damage'],
      value: 'spirit',
    });

    expect(untranslated).toHaveLength(1);
  });
});
