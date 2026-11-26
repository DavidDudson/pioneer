import { describe, expect, test } from 'bun:test';

import { fieldIssues } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import type * as z from 'zod';

import { ContentEntryModel } from './content-entry';
import { ContentId, contentId, EntrySlug, PackId } from './content-id';
import type { JsonValue } from './json-bounds';
import { RuleReferences, unconditionalGrants } from './rule-reference';
import { ContentEntry } from './typed-content-entry';

function issuesOf(schema: z.ZodType, value: JsonValue): readonly FieldIssue[] {
  const result = schema.safeParse(value);

  return result.success ? [] : fieldIssues(result.error.issues);
}

const typed = (value: JsonValue): readonly FieldIssue[] => issuesOf(ContentEntry, value);
const model = (value: JsonValue): readonly FieldIssue[] => issuesOf(ContentEntryModel, value);
const paths = (issues: readonly FieldIssue[]): readonly (readonly PropertyKey[])[] => issues.map((issue) => issue.path);

const PACK = 'player-core';
const idOf = (slug: string): string => contentId(PackId.parse(PACK), EntrySlug.parse(slug));
const description = [{ type: 'paragraph', content: [{ type: 'text', text: 'Short and adaptable.' }] }];
const sources = [{ kind: 'book', book: 'player-core', page: 42 }];

const language = {
  id: idOf('language:common'),
  pack: PACK,
  kind: 'language',
  slug: 'language:common',
  name: 'Common',
  rarity: 'common',
  traits: [],
  sources,
  description,
  rules: [],
  data: { script: 'common' },
};

const creature = {
  id: idOf('creature:giant-rat'),
  pack: PACK,
  kind: 'creature',
  slug: 'creature:giant-rat',
  name: 'Giant Rat',
  level: -1,
  rarity: 'common',
  traits: ['animal'],
  sources,
  description,
  rules: [],
  data: {
    role: 'monster',
    size: 'small',
    perception: 5,
    attributes: { str: 1, dex: 3, con: 2, int: -4, wis: 1, cha: -3 },
    armorClass: 15,
    saves: { fortitude: 6, reflex: 7, will: 3 },
    hitPoints: 8,
    immunities: [],
    weaknesses: [],
    resistances: [],
    speed: 30,
  },
};

const ability = { name: 'Disease', traits: [], description, rules: [] };

describe('ContentEntry over the content model', () => {
  test('both accept an entry with well-formed rules', () => {
    const entry = { ...language, rules: [{ key: 'GrantItem', item: idOf('language:elven') }] };

    expect(model(entry)).toStrictEqual([]);
    expect(typed(entry)).toStrictEqual([]);
  });

  test('both reject an unknown rule key at the same path', () => {
    const entry = { ...language, rules: [{ key: 'NotAnElement' }] };

    expect(paths(model(entry))).toStrictEqual([['rules', 0, 'key']]);
    expect(paths(typed(entry))).toStrictEqual([['rules', 0, 'key']]);
  });

  test('the model holds a malformed element that the typed schema rejects', () => {
    const entry = { ...language, rules: [{ key: 'GrantItem' }] };

    expect(model(entry)).toStrictEqual([]);
    expect(paths(typed(entry))).toContainEqual(['rules', 0, 'item']);
  });

  test('reports a creature ability’s bad rule element under the ability', () => {
    const entry = {
      ...creature,
      data: { ...creature.data, abilities: [{ ...ability, rules: [{ key: 'GrantItem' }] }] },
    };

    expect(model(entry)).toStrictEqual([]);
    expect(paths(typed(entry))).toContainEqual(['data', 'abilities', 0, 'rules', 0, 'item']);
  });

  test('lists the description, rules and data issues in the order the model held them', () => {
    const entry = {
      ...language,
      description: [{ type: 'html', html: '<b>hi</b>' }],
      rules: [{ key: 'NotAnElement' }],
      data: { bogus: 1 },
    };

    const reported = paths(typed(entry));

    expect(reported.findIndex((path) => path[0] === 'description')).toBeLessThan(
      reported.findIndex((path) => path[0] === 'rules'),
    );
    expect(reported.findIndex((path) => path[0] === 'rules')).toBeLessThan(
      reported.findIndex((path) => path[0] === 'data'),
    );
  });

  test('stops at the rules when the id also mismatches, as the model did', () => {
    const entry = { ...language, id: idOf('language:other'), rules: [{ key: 'NotAnElement' }] };

    expect(paths(typed(entry))).toStrictEqual([['rules', 0, 'key']]);
  });
});

describe('unconditionalGrants', () => {
  const item = ContentId.parse(idOf('feat:toughness'));

  const rules = RuleReferences.parse([
    { key: 'GrantItem', item },
    { key: 'GrantItem', item: idOf('feat:guarded'), predicate: ['self:trained'] },
    { key: 'FlatModifier' },
  ]);

  test('names the items granted behind no predicate, and only those', () => {
    expect([...unconditionalGrants(rules)]).toStrictEqual([item]);
  });
});
