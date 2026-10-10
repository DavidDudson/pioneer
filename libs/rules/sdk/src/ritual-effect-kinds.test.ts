import { describe, expect, test } from 'bun:test';

import { fieldIssues, ValidationMessage } from '@pioneer/shared/kernel';
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

describe('ritual, tradition and effect kinds', () => {
  test.each([
    ['a ritual', consecrate],
    ['a spellcasting tradition', arcane],
    ['an effect', heroism],
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
    const below = { ...heroism, data: { ...heroism.data, badge: { type: 'counter', value: 0, min: 1, max: 3 } } };
    expect(found(below)).toStrictEqual([`data.badge.value ${RulesMessage.EffectBadgeRange}`]);
  });

  test('rejects data fields a kind does not have', () => {
    expect(found({ ...consecrate, data: { ...consecrate.data, traditions: [] } })).toStrictEqual([
      `data.traditions ${ValidationMessage.UnrecognizedKeys}`,
    ]);
    expect(found({ ...heroism, data: { ...heroism.data, tokenIcon: { show: true } } })).toStrictEqual([
      `data.tokenIcon ${ValidationMessage.UnrecognizedKeys}`,
    ]);
  });
});
