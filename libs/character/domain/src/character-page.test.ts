import { describe, expect, test } from 'bun:test';

import { AncestryId, ContentId } from '@pioneer/rules/sdk';

import { CharacterFilter, filterConditionsOf } from './character-page';

const classId = ContentId.parse('00000000-0000-4000-8000-000000000001');
const ancestryId = AncestryId.parse('00000000-0000-4000-8000-000000000002');

describe('filterConditionsOf', () => {
  test('no filter makes no condition', () => {
    expect(filterConditionsOf(CharacterFilter.parse({}))).toStrictEqual([]);
  });

  test('a level range keeps the open end open', () => {
    expect(filterConditionsOf(CharacterFilter.parse({ minLevel: 3 }))).toStrictEqual([
      { property: 'level', operator: 'between', values: ['3', ''] },
    ]);

    expect(filterConditionsOf(CharacterFilter.parse({ maxLevel: 9 }))).toStrictEqual([
      { property: 'level', operator: 'between', values: ['', '9'] },
    ]);
  });

  test('class, ancestry and name each make one condition, after the level', () => {
    const filter = CharacterFilter.parse({ minLevel: 1, maxLevel: 2, classId, ancestry: ancestryId, name: 'kyr' });

    expect(filterConditionsOf(filter)).toStrictEqual([
      { property: 'level', operator: 'between', values: ['1', '2'] },
      { property: 'class', operator: 'is', values: [classId] },
      { property: 'ancestry', operator: 'is', values: [ancestryId] },
      { property: 'name', operator: 'contains', values: ['kyr'] },
    ]);
  });
});
