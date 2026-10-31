import { describe, expect, test } from 'bun:test';

import { ContentId } from '@pioneer/rules/sdk';

import { NO_REFERENCES } from './entry-references';
import type { EntryReferences } from './entry-references';
import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');
const ASSURANCE = ContentId.parse('00000000-0000-5000-8000-000000000001');
const WARDS = ContentId.parse('00000000-0000-5000-8000-000000000002');
const SPIRAL = ContentId.parse('00000000-0000-5000-8000-000000000003');

const references: EntryReferences = {
  ...NO_REFERENCES,
  byUuid: new Map([
    ['Compendium.pf2e.feats-srd.Item.Assurance', ASSURANCE],
    ['Compendium.pf2e.spell-effects.Item.Spell Effect: Protective Wards', WARDS],
    ['Compendium.pf2e.spell-effects.Item.Spell Effect: Spiral of Horrors', SPIRAL],
  ]),
};

function translated(raw: object): RuleTranslation {
  return translateRules(ENTRY, [raw], { lang: {}, values: { item: '' }, references });
}

describe('GrantItem from Foundry', () => {
  test('preselected choices become choices by flag', () => {
    const { rules, untranslated } = translated({
      key: 'GrantItem',
      preselectChoices: { assurance: 'athletics', specialtyCrafting: 'stonemasonry' },
      uuid: 'Compendium.pf2e.feats-srd.Item.Assurance',
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        key: 'GrantItem',
        item: ASSURANCE,
        choices: { assurance: 'athletics', 'specialty-crafting': 'stonemasonry' },
      },
    ]);
  });

  test('the flag a grant is named by becomes a slug', () => {
    const { rules, untranslated } = translated({
      flag: 'dragonBreath',
      key: 'GrantItem',
      uuid: 'Compendium.pf2e.feats-srd.Item.Assurance',
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([{ key: 'GrantItem', item: ASSURANCE, flag: 'dragon-breath' }]);
  });

  test('where the sheet files the grant, and re-evaluating it on update, are dropped', () => {
    const { rules, untranslated } = translated({
      allowDuplicate: false,
      key: 'GrantItem',
      nestUnderGranter: false,
      predicate: [{ gte: ['self:level', 5] }],
      reevaluateOnUpdate: true,
      uuid: 'Compendium.pf2e.feats-srd.Item.Assurance',
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        key: 'GrantItem',
        item: ASSURANCE,
        allowDuplicate: false,
        predicate: [{ gte: ['self:level', 5] }],
      },
    ]);
  });
});

describe('Aura from Foundry', () => {
  test('a radius, traits and an effect on enemies carry over, the effect as an entry', () => {
    const { rules, untranslated } = translated({
      effects: [
        {
          affects: 'enemies',
          events: ['enter'],
          uuid: 'Compendium.pf2e.spell-effects.Item.Spell Effect: Spiral of Horrors',
        },
      ],
      key: 'Aura',
      radius: 30,
      slug: 'dread-aura',
      traits: ['emotion', 'fear', 'mental'],
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        key: 'Aura',
        radius: 30,
        slug: 'dread-aura',
        traits: ['emotion', 'fear', 'mental'],
        effects: [{ effect: SPIRAL, affects: 'enemies', events: ['enter'] }],
      },
    ]);
  });

  test('an effect that leaves the bearer out and a predicate carry over', () => {
    const { rules, untranslated } = translated({
      effects: [
        {
          affects: 'allies',
          includesSelf: false,
          uuid: 'Compendium.pf2e.spell-effects.Item.Spell Effect: Protective Wards',
        },
      ],
      key: 'Aura',
      predicate: ['self:shield:raised'],
      radius: 5,
      slug: 'forge-warden',
    });

    expect(untranslated).toEqual([]);
    expect(rules).toHaveLength(1);
  });

  test('an aura with no effect is a marker', () => {
    expect(translated({ key: 'Aura', radius: 60, traits: ['primal'] }).untranslated).toEqual([]);
  });

  test('a radius read from the item’s badge is a formula of its value', () => {
    const { rules, untranslated } = translated({ key: 'Aura', radius: '5 * @item.badge.value' });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([{ key: 'Aura', radius: '5 * @item.value' }]);
  });

  test('an effect that does not resolve is kept for the backlog', () => {
    const raw = { key: 'Aura', effects: [{ uuid: 'Compendium.pf2e.spell-effects.Item.Unknown' }], radius: 5 };

    expect(translated(raw).untranslated).toEqual([{ entry: ENTRY, key: 'Aura', raw }]);
  });
});
