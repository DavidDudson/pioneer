import type { ItemEntry } from '@pioneer/character/domain';
import { ItemFixture, itemFixtureContent, itemFixtureId } from '@pioneer/character/domain/testing';
import { BulkWeight } from '@pioneer/rules/sdk';
import { shownRows } from '@pioneer/rules/ui';
import { describe, expect, it } from 'vitest';

import { CarryChoice } from './carry-options';
import { bulkCarried, CARRY_ORDER, carryRows } from './carry-picker';

const content = itemFixtureContent();

function entry(name: ItemFixture): ItemEntry | undefined {
  return content.get(itemFixtureId(name));
}

const say = (key: string): string => key;

describe(bulkCarried, () => {
  it('adds no Bulk once dropped, or when the content is gone', () => {
    expect(bulkCarried(entry(ItemFixture.Anvil), CarryChoice.Dropped)).toBe(BulkWeight.Negligible);
    expect(bulkCarried(undefined, CarryChoice.Stowed)).toBe(BulkWeight.Negligible);
  });

  it('weighs a container by how it is carried: negligible worn, light stowed', () => {
    expect(bulkCarried(entry(ItemFixture.Backpack), CarryChoice.Worn)).toBe(BulkWeight.Negligible);
    expect(bulkCarried(entry(ItemFixture.Backpack), CarryChoice.Stowed)).toBe(BulkWeight.Light);
  });
});

describe(carryRows, () => {
  it('lists the ways the item can be carried, with the hands each takes', () => {
    const rows = carryRows(entry(ItemFixture.Greatsword), say);

    expect(rows.map((row) => [row.value, row.hands])).toStrictEqual([
      [CarryChoice.TwoHands, 2],
      [CarryChoice.Stowed, 0],
      [CarryChoice.Dropped, 0],
    ]);
  });

  it('can be searched by the effect it names and sorted by hands', () => {
    const rows = carryRows(entry(ItemFixture.Longsword), say);

    expect(shownRows(rows, { query: 'oneHand', sort: undefined }, CARRY_ORDER)).toHaveLength(1);
    const byHands = shownRows(rows, { query: '', sort: { column: 'hands', descending: true } }, CARRY_ORDER);
    expect(byHands[0]?.value).toBe(CarryChoice.TwoHands);
  });
});
