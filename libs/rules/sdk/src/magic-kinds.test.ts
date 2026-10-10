import { describe, expect, test } from 'bun:test';

import { fieldIssues, message, ValidationMessage } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';

import { ContentEntry } from './content-entry';
import { contentId, PackId, Slug } from './content-id';
import { RulesMessage } from './messages';

function issues(value: unknown): readonly FieldIssue[] {
  const result = ContentEntry.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

/** Each issue as `<path> <message key>`, sorted. */
function found(value: unknown): readonly string[] {
  return issues(value)
    .map((issue) => `${issue.path.join('.')} ${issue.message.key}`)
    .toSorted();
}

const PACK = 'player-core';
const idOf = (slug: string): string => contentId(PackId.parse(PACK), Slug.parse(slug));
const prose = (text: string): unknown[] => [{ type: 'paragraph', content: [{ type: 'text', text }] }];

/** The envelope of a Player Core entry, without its kind and data. */
function entry(slug: string, name: string): object {
  return {
    id: idOf(slug),
    pack: PACK,
    slug,
    name,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 42 }],
    description: prose(name),
    rules: [],
  };
}

/* Foundry pf2e's Player Core entries, in Pioneer's words. */

const fireball = {
  ...entry('fireball', 'Fireball'),
  kind: 'spell',
  traits: ['concentrate', 'fire', 'manipulate'],
  data: {
    rank: 3,
    traditions: ['arcane', 'primal'],
    time: { type: 'actions', cost: 'two' },
    range: { type: 'feet', feet: 500 },
    area: { shape: 'burst', size: 20 },
    defense: { save: { statistic: 'save:reflex', basic: true } },
    damage: [{ key: '0', formula: '6d6', damageType: 'fire', kinds: ['damage'] }],
    heightening: { type: 'interval', interval: 1, damage: [{ key: '0', formula: '2d6' }] },
  },
};

const heal = {
  ...entry('heal', 'Heal'),
  kind: 'spell',
  traits: ['healing', 'manipulate', 'vitality'],
  data: {
    rank: 1,
    traditions: ['divine', 'primal'],
    time: { type: 'actions', cost: 'one', upTo: 'three' },
    targets: {
      any: [
        { count: 1, of: 'creature', qualifiers: ['willing', 'living'] },
        { count: 1, of: 'creature', traits: ['undead'] },
      ],
    },
    defense: { save: { statistic: 'save:fortitude', basic: true } },
    damage: [{ key: '0', formula: '1d8', damageType: 'vitality', kinds: ['damage', 'healing'] }],
    heightening: { type: 'interval', interval: 1, damage: [{ key: '0', formula: '1d8' }] },
  },
};

const shield = {
  ...entry('shield', 'Shield'),
  kind: 'spell',
  traits: ['cantrip', 'concentrate', 'force'],
  data: {
    rank: 1,
    traditions: ['arcane', 'divine', 'occult'],
    time: { type: 'actions', cost: 'one' },
    duration: { type: 'until', until: 'next-turn-start' },
    damage: [],
    heightening: {
      type: 'fixed',
      ranks: [{ rank: 3 }, { rank: 5 }, { rank: 7 }, { rank: 9 }],
    },
  },
};

const consecrate = {
  ...entry('consecrate', 'Consecrate'),
  kind: 'ritual',
  rarity: 'uncommon',
  traits: ['consecration'],
  data: {
    rank: 2,
    time: { type: 'time', count: 3, unit: 'day' },
    cost: prose('rare incense and offerings worth a total value of 20 gp × the spell rank'),
    range: { type: 'feet', feet: 40 },
    area: { shape: 'burst', size: 40 },
    duration: { type: 'time', count: 1, unit: 'year' },
    primary: { skills: ['skill:religion'] },
    secondary: { checks: [{ skills: ['skill:crafting'] }, { skills: ['skill:performance'] }], casters: 2 },
  },
};

const arcane = {
  ...entry('arcane', 'Arcane'),
  kind: 'spellcasting-tradition',
  data: { skill: 'skill:arcana' },
};

const heroism = {
  ...entry('spell-effect-heroism', 'Spell Effect: Heroism'),
  kind: 'effect',
  level: 3,
  rules: [
    {
      key: 'FlatModifier',
      selectors: ['attack-roll', 'saving-throw', 'skill-check', 'perception'],
      type: 'status',
      value: 'ternary(gte(@item.level, 9), 3, ternary(gte(@item.level, 6), 2, 1))',
    },
  ],
  data: { category: 'spell', duration: { type: 'time', count: 10, unit: 'minute', expiry: 'turn-start' } },
};

describe('magic and effect kinds', () => {
  test.each([
    ['a spell with damage heightened by interval', fireball],
    ['a spell cast with one to three actions at alternative targets', heal],
    ['a cantrip with fixed heightening', shield],
    ['a ritual', consecrate],
    ['a spellcasting tradition', arcane],
    ['an effect', heroism],
    [
      'a sustained spell attack',
      {
        ...fireball,
        data: {
          ...fireball.data,
          defense: { against: 'ac' },
          duration: { type: 'time', count: 1, unit: 'minute', sustained: true },
        },
      },
    ],
    [
      'an effect with a counter',
      {
        ...heroism,
        data: {
          category: 'other',
          duration: { type: 'encounter' },
          badge: { type: 'counter', value: 1, min: 1, max: 3, labels: ['One', 'Two', 'Three'] },
        },
      },
    ],
  ])('accepts %s', (_name, value) => {
    expect(issues(value)).toStrictEqual([]);
  });

  test('a casting time runs from fewer actions to more', () => {
    const backwards = { ...heal, data: { ...heal.data, time: { type: 'actions', cost: 'three', upTo: 'two' } } };
    const reaction = { ...heal, data: { ...heal.data, time: { type: 'actions', cost: 'reaction', upTo: 'three' } } };

    expect(found(backwards)).toStrictEqual([`data.time.upTo ${RulesMessage.SpellCastUpTo}`]);
    expect(found(reaction)).toStrictEqual([`data.time.upTo ${RulesMessage.SpellCastUpTo}`]);
  });

  test('a defence names a save or what it is against', () => {
    const empty = { ...fireball, data: { ...fireball.data, defense: {} } };
    const notASave = {
      ...fireball,
      data: { ...fireball.data, defense: { save: { statistic: 'ac', basic: true } } },
    };

    expect(found(empty)).toStrictEqual([`data.defense ${RulesMessage.SpellDefenseEmpty}`]);
    expect(found(notASave)).toStrictEqual([`data.defense.save.statistic ${RulesMessage.SaveSelector}`]);
  });

  test('damage parts have distinct keys, and heightening adds only to them', () => {
    const repeated = {
      ...fireball,
      data: { ...fireball.data, damage: [...fireball.data.damage, ...fireball.data.damage] },
    };
    const unknownPart = {
      ...fireball,
      data: {
        ...fireball.data,
        heightening: { type: 'interval', interval: 1, damage: [{ key: 'splash', formula: '1d6' }] },
      },
    };

    expect(issues(repeated)).toStrictEqual([
      { path: ['data', 'damage', 1, 'key'], message: message(RulesMessage.ListDuplicate, { value: '0' }) },
    ]);
    expect(issues(unknownPart)).toStrictEqual([
      {
        path: ['data', 'heightening', 'damage', 0, 'key'],
        message: message(RulesMessage.SpellDamageKey, { key: 'splash' }),
      },
    ]);
  });

  test('fixed heightening names each rank once, above the spell', () => {
    const invalid = {
      ...shield,
      data: { ...shield.data, heightening: { type: 'fixed', ranks: [{ rank: 1 }, { rank: 3 }, { rank: 3 }] } },
    };

    expect(issues(invalid)).toStrictEqual([
      {
        path: ['data', 'heightening', 'ranks', 0, 'rank'],
        message: message(RulesMessage.SpellHeightenAbove, { rank: 1 }),
      },
      { path: ['data', 'heightening', 'ranks', 2, 'rank'], message: message(RulesMessage.ListDuplicate, { value: 3 }) },
    ]);
  });

  test("checks a spell's rank, traditions, range, area and targets", () => {
    const invalid = {
      ...fireball,
      data: {
        ...fireball.data,
        rank: 11,
        traditions: ['arcane', 'arcane', 'elemental'],
        range: { type: 'feet' },
        area: { shape: 'burst', size: 20, width: 10 },
        targets: { any: [] },
      },
    };

    expect(found(invalid)).toStrictEqual([
      `data.area.width ${RulesMessage.RichTextWidthOnLine}`,
      `data.range.feet ${ValidationMessage.InvalidType}`,
      `data.rank ${ValidationMessage.TooBig}`,
      `data.targets.any ${ValidationMessage.TooSmall}`,
      `data.traditions.2 ${ValidationMessage.InvalidValue}`,
    ]);
  });

  test('ritual checks and a tradition’s skill are skill selectors', () => {
    const ritual = {
      ...consecrate,
      data: { ...consecrate.data, primary: { skills: ['skill:religion', 'religion'], proficiency: 'expert' } },
    };

    expect(found(ritual)).toStrictEqual([`data.primary.skills.1 ${RulesMessage.SkillSelector}`]);
    expect(found({ ...arcane, data: { skill: 'perception' } })).toStrictEqual([
      `data.skill ${RulesMessage.SkillSelector}`,
    ]);
  });

  test('a counter badge starts between its bounds', () => {
    const outside = {
      ...heroism,
      data: { ...heroism.data, badge: { type: 'counter', value: 4, min: 1, max: 3 } },
    };

    expect(found(outside)).toStrictEqual([`data.badge.value ${RulesMessage.EffectBadgeRange}`]);
  });

  test('rejects data fields a kind does not have', () => {
    expect(found({ ...fireball, data: { ...fireball.data, location: { heightenedLevel: 3 } } })).toStrictEqual([
      `data.location ${ValidationMessage.UnrecognizedKeys}`,
    ]);
    expect(found({ ...consecrate, data: { ...consecrate.data, traditions: [] } })).toStrictEqual([
      `data.traditions ${ValidationMessage.UnrecognizedKeys}`,
    ]);
    expect(found({ ...heroism, data: { ...heroism.data, tokenIcon: { show: true } } })).toStrictEqual([
      `data.tokenIcon ${ValidationMessage.UnrecognizedKeys}`,
    ]);
  });
});
