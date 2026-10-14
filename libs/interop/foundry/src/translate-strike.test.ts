import { describe, expect, test } from 'bun:test';

import { ContentId, RuleElementKey } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

function translated(raw: object): RuleTranslation {
  return translateRules(ENTRY, [raw], { lang: {}, values: { item: '' } });
}

/** Foundry writes a melee attack's range as `null`. */
const NO_RANGE: unknown = JSON.parse('null');

const JAWS = {
  key: 'Strike',
  baseType: 'jaws',
  category: 'unarmed',
  group: 'brawling',
  damage: { base: { damageType: 'piercing', dice: 1, die: 'd8' } },
  predicate: ['animal-feature:jaws'],
  range: NO_RANGE,
  traits: ['unarmed', 'magical'],
};

describe('Strike from Foundry', () => {
  test('an attack named by its base type loses the base type and a null range, and keeps its damage', () => {
    const { rules, untranslated } = translated(JAWS);

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        key: RuleElementKey.Strike,
        slug: 'jaws',
        category: 'unarmed',
        group: 'brawling',
        damage: { dice: 1, die: 'd8', damageType: 'piercing' },
        predicate: ['animal-feature:jaws'],
        traits: ['unarmed', 'magical'],
      },
    ]);
  });

  test('a slug stays over the base type, and a range increment is its number', () => {
    const { rules, untranslated } = translated({
      ...JAWS,
      slug: 'razortooth-jaws',
      range: { increment: 30 },
    });

    expect(untranslated).toEqual([]);
    expect(rules).toMatchObject([{ slug: 'razortooth-jaws', range: 30 }]);
  });

  test('an attack with neither slug nor base type is kept for the backlog', () => {
    const { baseType: _baseType, ...nameless } = JAWS;

    expect(translated(nameless).untranslated).toHaveLength(1);
  });

  test('damage dice read from a formula are kept for the backlog', () => {
    const { untranslated } = translated({
      ...JAWS,
      damage: { base: { damageType: 'piercing', dice: 'ternary(gte(@item.level, 10), 4, 3)', die: 'd8' } },
    });

    expect(untranslated).toHaveLength(1);
  });
});

describe('AdjustStrike from Foundry', () => {
  test('a trait added to the weapons it defines is an ItemAlteration of them', () => {
    const { rules, untranslated } = translated({
      key: 'AdjustStrike',
      definition: ['item:slug:sword'],
      mode: 'add',
      predicate: ['parent:origin:trait:holy'],
      property: 'traits',
      value: 'holy',
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        key: RuleElementKey.ItemAlteration,
        items: ['item:slug:sword'],
        mode: 'add',
        predicate: ['parent:origin:trait:holy'],
        property: 'traits',
        value: 'holy',
      },
    ]);
  });

  test.each([
    ['range-increment', 'multiply', 0.5],
    ['range-increment', 'add', 10],
    ['materials', 'add', 'cold-iron'],
    ['property-runes', 'add', 'flaming'],
  ])('a %s %s of %j carries over', (property, mode, value) => {
    const { rules, untranslated } = translated({
      key: 'AdjustStrike',
      definition: ['item:ranged', { not: 'item:rune:property:underwater' }],
      mode,
      property,
      value,
    });

    expect(untranslated).toEqual([]);
    expect(rules).toMatchObject([{ key: RuleElementKey.ItemAlteration, property, mode, value }]);
  });

  test.each([
    ['no definition', { property: 'traits', value: 'holy' }],
    [
      'strike selectors',
      { definition: ['item:ranged'], selectors: ['strike-damage'], property: 'traits', value: 'holy' },
    ],
    [
      'a value read from a pick',
      { definition: ['item:ranged'], property: 'materials', value: '{item|flags.system.rulesSelections.m}' },
    ],
    [
      'a definition built from a pick',
      { definition: ['item:slug:{item|flags.system.rulesSelections.w}'], property: 'traits', value: 'holy' },
    ],
    ['a property Pioneer does not alter', { definition: ['item:ranged'], property: 'description', value: 'x' }],
  ])('%s is kept for the backlog', (_name, fields) => {
    const { rules, untranslated } = translated({ key: 'AdjustStrike', mode: 'add', ...fields });

    expect(rules).toEqual([]);
    expect(untranslated).toHaveLength(1);
  });
});
