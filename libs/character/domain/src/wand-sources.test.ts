import { describe, expect, test } from 'bun:test';

import { SpellRank } from '@pioneer/rules/sdk';

import { ItemQuantity } from './inventory';
import { FRESH_PLAY } from './play-state';
import { ResourceCount } from './resource-count';
import { fireballWand, ItemFixture, itemFixtureId, staffSpellId, wandEntry, wandSourceOf } from './testing';

const ONE = ResourceCount.parse(1);
const THREE = ResourceCount.parse(3);

describe('wandSources', () => {
  test('lists a held wand with its spell, the entry that casts it and its casts left', () => {
    const source = wandSourceOf([fireballWand()]);
    expect(source?.wand.spell).toBe(staffSpellId('fireball'));
    expect(source?.wand.rank).toBe(SpellRank.parse(3));
    expect(source?.entry?.tradition).toBe('arcane');
    expect(source?.problem).toBeUndefined();
    expect(source?.broken).toBe(false);
    expect(source?.use).toEqual({ left: ONE, max: ONE });
    expect(source?.overcharge).toEqual({ left: ONE, max: ONE });
  });

  test('leaves out a wand that is stowed, worn or dropped', () => {
    expect(wandSourceOf([fireballWand({ carry: { state: 'stowed' } })])).toBeUndefined();
    expect(wandSourceOf([fireballWand({ carry: { state: 'worn' } })])).toBeUndefined();
    expect(wandSourceOf([fireballWand({ carry: { state: 'dropped' } })])).toBeUndefined();
  });

  test('leaves out an item that is no wand', () => {
    const rope = fireballWand({ item: itemFixtureId(ItemFixture.Rope) });
    expect(wandSourceOf([rope])).toBeUndefined();
  });

  test('gives each wand of a line its own casts', () => {
    const source = wandSourceOf([fireballWand({ quantity: ItemQuantity.parse(3) })]);
    expect(source?.use).toEqual({ left: THREE, max: THREE });
    expect(source?.overcharge).toEqual({ left: THREE, max: THREE });
  });

  test('marks a wand broken', () => {
    expect(wandSourceOf([fireballWand({ broken: true })])?.broken).toBe(true);
  });

  test('reports a spell the holder has no list for', () => {
    const source = wandSourceOf([fireballWand()], FRESH_PLAY, [wandEntry('divine', [1, 2, 3])]);
    expect(source?.problem).toBe('not-on-list');
  });

  test('reports a spell above the ranks the holder casts', () => {
    const source = wandSourceOf([fireballWand()], FRESH_PLAY, [wandEntry('arcane', [1, 2])]);
    expect(source?.problem).toBe('rank-too-high');
  });
});
