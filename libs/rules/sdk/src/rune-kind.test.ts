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

/** The envelope of a Player Core item at `level`, without its kind and data. */
function item(slug: string, name: string, level: number): object {
  return {
    id: idOf(slug),
    pack: PACK,
    slug,
    name,
    level,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 42 }],
    description: prose(name),
    rules: [],
  };
}

/* Foundry pf2e's Player Core and GM Core runes, in Pioneer's words. */

const striking = {
  ...item('striking', 'Striking', 4),
  kind: 'rune',
  traits: ['magical'],
  data: {
    price: { coins: { gp: 65 } },
    bulk: 'negligible',
    type: 'fundamental',
    rune: 'striking',
    grade: 1,
    etchedOnto: { item: 'weapon' },
  },
};

const flaming = {
  ...item('flaming', 'Flaming', 8),
  kind: 'rune',
  traits: ['fire', 'magical'],
  data: { price: { coins: { gp: 500 } }, bulk: 'negligible', type: 'property', etchedOnto: { item: 'weapon' } },
};

const reinforcing = {
  ...item('reinforcing-rune-minor', 'Reinforcing Rune (Minor)', 4),
  kind: 'rune',
  traits: ['magical'],
  data: {
    price: { coins: { gp: 75 } },
    bulk: 'negligible',
    type: 'fundamental',
    rune: 'reinforcing',
    grade: 1,
    etchedOnto: { item: 'shield' },
  },
};

describe('rune kind', () => {
  test.each([
    ['a fundamental weapon rune', striking],
    ['a property rune', flaming],
    ['a reinforcing rune', reinforcing],
    ['a reinforcing rune at its highest grade', { ...reinforcing, data: { ...reinforcing.data, grade: 6 } }],
    [
      'a rune narrowed to some weapons',
      { ...flaming, data: { ...flaming.data, etchedOnto: { item: 'weapon', restriction: 'melee' } } },
    ],
  ])('accepts %s', (_name, value) => {
    expect(issues(value)).toStrictEqual([]);
  });

  test('a fundamental rune goes on the items it is for', () => {
    const onArmor = { ...striking, data: { ...striking.data, etchedOnto: { item: 'armor' } } };

    expect(issues(onArmor)).toStrictEqual([
      {
        path: ['data', 'etchedOnto', 'item'],
        message: message(RulesMessage.RuneEtchedOnto, { rune: 'striking', item: 'armor' }),
      },
    ]);
  });

  test('only a reinforcing rune goes past grade 4', () => {
    const fifth = { ...striking, data: { ...striking.data, grade: 5 } };

    expect(issues(fifth)).toStrictEqual([
      { path: ['data', 'grade'], message: message(RulesMessage.RuneGrade, { rune: 'striking', max: 4 }) },
    ]);
    expect(found({ ...reinforcing, data: { ...reinforcing.data, grade: 7 } })).toStrictEqual([
      `data.grade ${ValidationMessage.TooBig}`,
    ]);
  });

  test('a property rune has no grade', () => {
    expect(found({ ...flaming, data: { ...flaming.data, grade: 1 } })).toStrictEqual([
      `data.grade ${ValidationMessage.UnrecognizedKeys}`,
    ]);
  });
});
