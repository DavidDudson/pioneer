import { describe, expect, test } from 'bun:test';

import { RuleElement } from './rule-element';

const SENSE = '00000000-0000-5000-8000-000000000000';

const BAT_FORM = {
  key: 'BattleForm',
  predicate: ['aerial-form:bat'],
  form: {
    senses: [{ sense: SENSE, acuity: 'precise', range: 40 }],
    speeds: { fly: 30, land: 20 },
    strikes: [
      {
        slug: 'fangs',
        ability: 'dex',
        category: 'unarmed',
        damage: { damageType: 'piercing', dice: 2, die: 'd8' },
        traits: ['unarmed'],
      },
    ],
    traits: ['animal'],
    hasHands: false,
  },
  brackets: [
    {
      start: 4,
      armorClass: { modifier: '18 + @level', ignoreCheckPenalty: true },
      size: 'medium',
      skills: [{ skill: 'skill:acrobatics', modifier: 16 }],
      strikes: [{ slug: 'fangs', modifier: 16, damage: { modifier: 5 } }],
      tempHP: 5,
    },
    { start: 5, size: 'large', tempHP: 10, weaknesses: [{ type: 'water', value: 5 }] },
  ],
};

describe('BattleForm', () => {
  test.each([
    ['a heightened form', BAT_FORM],
    ['a form with nothing set', { key: 'BattleForm', form: {} }],
    [
      'a form that adds to the character’s own weapon',
      { key: 'BattleForm', form: { strikes: [{ slug: 'sacred-armament', modifier: 21 }] } },
    ],
    [
      'a resistance read from a formula',
      { key: 'BattleForm', form: { resistances: [{ type: 'fire', value: '5 + @level' }] } },
    ],
  ])('parses %s', (_name, element) => {
    expect(RuleElement.safeParse(element).success).toBe(true);
  });

  test.each([
    ['a size Pioneer does not name', { form: { size: 'med' } }],
    ['a movement type that does not exist', { form: { speeds: { teleport: 30 } } }],
    ['a negative speed', { form: { speeds: { fly: -5 } } }],
    ['a skill that is no skill selector', { form: { skills: [{ skill: 'athletics', modifier: 5 }] } }],
    ['a field the form does not read', { form: { mystery: true } }],
    ['a bracket without a rank', { form: {}, brackets: [{ tempHP: 5 }] }],
    ['a rank no spell has', { form: {}, brackets: [{ start: 11 }] }],
  ])('rejects %s', (_name, fields) => {
    expect(RuleElement.safeParse({ key: 'BattleForm', ...fields }).success).toBe(false);
  });
});
