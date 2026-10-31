import { describe, expect, test } from 'bun:test';

import { RuleElementKey } from '@pioneer/rules/sdk';

import { rulesIn } from './testing/build-helpers';
import { coreRulesId, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { FOUNDRY_NULL } from './testing/kind-fixtures';

const DARKVISION = coreRulesId('sense:darkvision');

/** A Player Core heritage with `rules`, shaped as `pf2e-8.6.0` has it. */
function heritage(rules: readonly object[]): DocumentFixture {
  return {
    id: 'hErItAgE00000000',
    name: 'Cavern Elf',
    type: 'heritage',
    system: { ancestry: FOUNDRY_NULL, rules, traits: { rarity: 'common', value: [] } },
  };
}

const AERIAL_FORM = {
  key: 'BattleForm',
  predicate: ['aerial-form:bat'],
  brackets: [
    {
      start: 4,
      value: {
        armorClass: { modifier: '18 + @actor.level' },
        size: 'med',
        skills: { acrobatics: { modifier: 16 } },
        strikes: { fangs: { damage: { modifier: 5 }, modifier: 16 } },
        tempHP: 5,
      },
    },
  ],
  overrides: {
    senses: { darkvision: {} },
    speeds: { fly: 30, land: 20 },
    strikes: {
      fangs: {
        ability: 'dex',
        category: 'unarmed',
        damage: { damageType: 'piercing', dice: 2, die: 'd8' },
        traits: ['unarmed'],
      },
    },
    traits: ['animal'],
  },
};

function formRules(rules: readonly object[]): unknown[] {
  return rulesIn(translate([heritage(rules)]), 'cavern-elf');
}

/** What every form forbids unless it says otherwise: casting, speaking and hands. */
const FORBIDS = { canCast: false, canSpeak: false, hasHands: false };

describe('translateRules: BattleForm', () => {
  test('the overrides become the form, each bracket a heightened change, records lists', () => {
    expect(formRules([AERIAL_FORM])).toEqual([
      {
        key: RuleElementKey.BattleForm,
        predicate: ['aerial-form:bat'],
        form: {
          ...FORBIDS,
          senses: [{ sense: DARKVISION }],
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
        },
        brackets: [
          {
            start: 4,
            armorClass: { modifier: '18 + @level' },
            size: 'medium',
            skills: [{ skill: 'skill:acrobatics', modifier: 16 }],
            strikes: [{ slug: 'fangs', damage: { modifier: 5 }, modifier: 16 }],
            tempHP: 5,
          },
        ],
      },
    ]);
  });

  test('hasHands, listed defence types, ranges and Strike names carry over', () => {
    const rules = formRules([
      {
        key: 'BattleForm',
        hasHands: true,
        overrides: {
          immunities: [{ type: ['critical-hits', 'precision'] }],
          weaknesses: [{ type: 'water', value: 5 }],
          resistances: [{ type: 'all-damage', value: '5 + @actor.level' }],
          strikes: {
            'hurled debris': {
              damage: { damageType: 'bludgeoning', dice: 1, die: 'd6' },
              range: { increment: 30, max: 120 },
            },
          },
        },
      },
    ]);

    expect(rules).toEqual([
      {
        key: RuleElementKey.BattleForm,
        form: {
          ...FORBIDS,
          hasHands: true,
          immunities: [{ type: 'critical-hits' }, { type: 'precision' }],
          weaknesses: [{ type: 'water', value: 5 }],
          resistances: [{ type: 'all', value: '5 + @level' }],
          strikes: [{ slug: 'hurled-debris', range: 30, damage: { damageType: 'bludgeoning', dice: 1, die: 'd6' } }],
        },
      },
    ]);
  });

  test('a Strike’s image, which only dresses the token, is left off', () => {
    const rules = formRules([
      {
        key: 'BattleForm',
        overrides: {
          strikes: {
            claw: { img: 'systems/pf2e/icons/claw.webp', damage: { damageType: 'slashing', dice: 1, die: 'd8' } },
          },
        },
      },
    ]);

    expect(rules).toEqual([
      {
        key: RuleElementKey.BattleForm,
        form: { ...FORBIDS, strikes: [{ slug: 'claw', damage: { damageType: 'slashing', dice: 1, die: 'd8' } }] },
      },
    ]);
  });

  test('a field Pioneer does not read keeps the element for the backlog', () => {
    const rules = formRules([{ ...AERIAL_FORM, overrides: { ...AERIAL_FORM.overrides, mystery: true } }]);

    expect(rules).toEqual([]);
  });
});

const DRAGON_CHOICES = [
  {
    label: 'Brine',
    value: {
      damageType: 'bludgeoning',
      dragonType: 'brine',
      speeds: { burrow: FOUNDRY_NULL, climb: FOUNDRY_NULL, swim: 60 },
    },
  },
  {
    label: 'Magma',
    value: {
      damageType: 'fire',
      dragonType: 'magma',
      speeds: { burrow: 20, climb: FOUNDRY_NULL, swim: FOUNDRY_NULL },
    },
  },
  {
    label: 'Cinder',
    value: {
      damageType: 'fire',
      dragonType: 'cinder',
      speeds: { burrow: FOUNDRY_NULL, climb: FOUNDRY_NULL, swim: FOUNDRY_NULL },
    },
  },
];

const DRAGON_RULES = [
  { key: 'ChoiceSet', flag: 'dragonForm', choices: DRAGON_CHOICES, prompt: 'Pick a dragon.' },
  { key: 'RollOption', option: 'dragon-form:{item|flags.system.rulesSelections.dragonForm.dragonType}' },
  {
    key: 'BattleForm',
    overrides: {
      hasHands: true,
      resistances: [{ type: '{item|flags.system.rulesSelections.dragonForm.damageType}', value: 10 }],
      speeds: {
        burrow: '@item.flags.system.rulesSelections.dragonForm.speeds.burrow',
        climb: '@item.flags.system.rulesSelections.dragonForm.speeds.climb',
        fly: 100,
        land: 40,
        swim: '@item.flags.system.rulesSelections.dragonForm.speeds.swim',
      },
      traits: ['dragon'],
    },
  },
];

describe('translateRules: BattleForm that reads a dragon type', () => {
  test('the pick becomes a slug that sets its roll option, and the form gets a variant for each type', () => {
    const rules = formRules(DRAGON_RULES);

    expect(rules).toEqual([
      {
        key: RuleElementKey.ChoiceSet,
        flag: 'dragon-form',
        rollOption: 'dragon-form',
        prompt: 'Pick a dragon.',
        choices: [
          { label: 'Brine', value: 'brine' },
          { label: 'Magma', value: 'magma' },
          { label: 'Cinder', value: 'cinder' },
        ],
      },
      {
        key: RuleElementKey.BattleForm,
        form: { ...FORBIDS, hasHands: true, speeds: { fly: 100, land: 40 }, traits: ['dragon'] },
        variants: [
          { predicate: ['dragon-form:brine'], speeds: { swim: 60 }, resistances: [{ type: 'bludgeoning', value: 10 }] },
          { predicate: ['dragon-form:magma'], speeds: { burrow: 20 }, resistances: [{ type: 'fire', value: 10 }] },
          { predicate: ['dragon-form:cinder'], resistances: [{ type: 'fire', value: 10 }] },
        ],
      },
    ]);
  });
});
