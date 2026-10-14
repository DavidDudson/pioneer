import { describe, expect, test } from 'bun:test';

import { ContentId, RuleElementKey } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');
/** Foundry writes a melee attack's range as `null`. */
const NO_RANGE: unknown = JSON.parse('null');
const LANG = { PF2E: { Weapon: { Base: { claw: 'Claw' } } } };

/** The rules as plain JSON, to compare with the plain spelling a pack file has. */
function plain(rules: readonly object[]): unknown {
  return structuredClone(rules);
}

function translated(raw: object): RuleTranslation {
  return translateRules(ENTRY, [raw], { lang: LANG, values: { item: 'Animal Feature' } });
}

describe('Strike from Foundry', () => {
  test('an attack of its own drops the base type and a null range, and is named by its label', () => {
    const { rules, untranslated } = translated({
      baseType: 'claw',
      img: 'icons/creatures/claws/claw-talons-glowing-orange.webp',
      category: 'unarmed',
      damage: { base: { damageType: 'slashing', dice: 1, die: 'd6' } },
      key: RuleElementKey.Strike,
      label: 'PF2E.Weapon.Base.claw',
      predicate: ['animal-feature:claw'],
      range: NO_RANGE,
      slug: 'claw',
      traits: ['agile', 'finesse', 'magical', 'unarmed'],
    });

    expect(untranslated).toEqual([]);
    expect(plain(rules)).toEqual([
      {
        key: RuleElementKey.Strike,
        category: 'unarmed',
        damage: { dice: 1, die: 'd6', damageType: 'slashing' },
        display: { label: 'Claw' },
        predicate: ['animal-feature:claw'],
        slug: 'claw',
        traits: ['agile', 'finesse', 'magical', 'unarmed'],
      },
    ]);
  });

  test('the brawling group and a range increment are kept', () => {
    const { rules, untranslated } = translated({
      baseType: 'jaws',
      category: 'unarmed',
      damage: { base: { damageType: 'piercing', dice: 1, die: 'd6' } },
      group: 'brawling',
      key: RuleElementKey.Strike,
      range: 20,
      slug: 'razortooth-jaws',
      traits: ['finesse'],
    });

    expect(untranslated).toEqual([]);
    expect(rules[0]).toMatchObject({ group: 'brawling', range: 20, slug: 'razortooth-jaws' });
  });

  test('a dice count read from a formula stays', () => {
    const { untranslated } = translated({
      category: 'unarmed',
      damage: { base: { damageType: 'slashing', dice: 'ternary(gte(@item.level, 10), 4, 2)', die: 'd6' } },
      key: RuleElementKey.Strike,
      slug: 'moon-frenzy-claws',
    });

    expect(untranslated).toHaveLength(1);
  });
});

describe('AdjustStrike from Foundry', () => {
  test('the definition becomes the weapons the adjustment reaches', () => {
    const { rules, untranslated } = translated({
      definition: ['item:deity-favored'],
      key: RuleElementKey.AdjustStrike,
      mode: 'add',
      predicate: ['divine-rebuttal', 'self:trait:holy'],
      property: 'traits',
      value: 'holy',
    });

    expect(untranslated).toEqual([]);
    expect(plain(rules)).toEqual([
      {
        key: RuleElementKey.AdjustStrike,
        mode: 'add',
        predicate: ['option:divine-rebuttal', 'self:trait:holy'],
        property: 'traits',
        strikes: ['item:deity-favored'],
        value: 'holy',
      },
    ]);
  });

  test('materials and property runes are added to a weapon named by its slug', () => {
    const material = translated({
      definition: ['item:slug:slag-may-claw'],
      key: RuleElementKey.AdjustStrike,
      mode: 'add',
      property: 'materials',
      value: 'silver',
    });
    const rune = translated({
      definition: ['item:ranged'],
      key: RuleElementKey.AdjustStrike,
      mode: 'add',
      property: 'property-runes',
      value: 'ghost-touch',
    });

    expect([material, rune].map(({ untranslated }) => untranslated)).toEqual([[], []]);
    expect(material.rules[0]).toMatchObject({ strikes: ['item:slug:slag-may-claw'], value: 'silver' });
    expect(rune.rules[0]).toMatchObject({ strikes: ['item:ranged'], value: 'ghost-touch' });
  });

  test('one that reaches every Strike has no weapons named', () => {
    const { rules, untranslated } = translated({
      key: RuleElementKey.AdjustStrike,
      mode: 'add',
      property: 'property-runes',
      value: 'holy',
    });

    expect(untranslated).toEqual([]);
    expect(rules[0]).not.toHaveProperty('strikes');
  });

  test('a range increment is changed by a number', () => {
    const { rules, untranslated } = translated({
      definition: ['item:thrown'],
      key: RuleElementKey.AdjustStrike,
      mode: 'multiply',
      property: 'range-increment',
      value: 2,
    });

    expect(untranslated).toEqual([]);
    expect(rules[0]).toMatchObject({ mode: 'multiply', property: 'range-increment', value: 2 });
  });

  test('an adjustment of a weapon or value read from a pick or the item, or of a roll domain, stays', () => {
    const own = translated({
      definition: ['item:id:{item|_id}'],
      key: RuleElementKey.AdjustStrike,
      mode: 'add',
      property: 'materials',
      value: 'silver',
    });
    const picked = translated({
      key: RuleElementKey.AdjustStrike,
      mode: 'add',
      property: 'property-runes',
      value: '{item|flags.system.rulesSelections.rune}',
    });
    const domain = translated({
      key: RuleElementKey.AdjustStrike,
      mode: 'add',
      property: 'property-runes',
      selectors: ['strike-attack-roll', 'strike-damage'],
      value: 'ghost-touch',
    });

    expect([own, picked, domain].map(({ untranslated }) => untranslated.length)).toEqual([1, 1, 1]);
  });
});

describe('Strike from Foundry without a slug', () => {
  test('an attack of its own is named by its base type, else by its label', () => {
    const base = translated({
      baseType: 'jaws',
      category: 'unarmed',
      damage: { base: { damageType: 'piercing', dice: 1, die: 'd8' } },
      key: RuleElementKey.Strike,
      label: 'PF2E.Weapon.Base.claw',
      predicate: ['shifting-form:jaws'],
    });
    const labelled = translated({
      category: 'unarmed',
      damage: { base: { damageType: 'piercing', dice: 1, die: 'd6' } },
      group: 'brawling',
      key: RuleElementKey.Strike,
      label: 'PF2E.Weapon.Base.claw',
      range: NO_RANGE,
    });

    expect([base, labelled].map(({ untranslated }) => untranslated)).toEqual([[], []]);
    expect(base.rules[0]).toMatchObject({ slug: 'jaws' });
    expect(labelled.rules[0]).toMatchObject({ slug: 'claw', group: 'brawling' });
  });

  test('a range read as an increment is a range', () => {
    const { rules, untranslated } = translated({
      category: 'unarmed',
      damage: { base: { damageType: 'bludgeoning', dice: 1, die: 'd4' } },
      key: RuleElementKey.Strike,
      label: 'PF2E.Weapon.Base.claw',
      range: { increment: 30 },
    });

    expect(untranslated).toEqual([]);
    expect(rules[0]).toMatchObject({ range: 30 });
  });

  test('an attack with no name to be had, and a fist, stay as they were', () => {
    const torch = translated({
      category: 'simple',
      damage: { base: { damageType: 'bludgeoning', dice: 1, die: 'd4' } },
      key: RuleElementKey.Strike,
      otherTags: ['improvised'],
    });
    const fist = translated({ key: RuleElementKey.Strike, fist: true });

    expect(torch.untranslated).toHaveLength(1);
    expect(fist.rules).toEqual([{ key: RuleElementKey.Strike, fist: true }]);
  });
});
