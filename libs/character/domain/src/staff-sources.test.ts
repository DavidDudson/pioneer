import { describe, expect, test } from 'bun:test';

import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import { Origin, SpellPreparation, STAFF_CANTRIP } from '@pioneer/rules/sdk';

import { InventoryItemId, InventoryItemSchema, ItemQuantity } from './inventory';
import type { InventoryItem } from './inventory';
import { spellContent } from './spell-content';
import { StaffChargesSchema } from './staff-charges';
import { StaffSpellProblem, staffSources } from './staff-sources';
import { ItemFixture, itemFixtureContent, itemFixtureId, itemFixtureRegistry, staffSpellId } from './testing';

const items = itemFixtureContent();

const spells = spellContent(itemFixtureRegistry());

const ORIGIN = Origin.parse({
  hops: [],
  entry: staffSpellId('ignition'),
  sources: [{ kind: 'web', url: 'https://example.com/' }],
});

/** A prepared entry of `tradition` with slots of `ranks`, one each. */
function entry(slug: string, tradition: 'arcane' | 'primal', ranks: readonly number[]): SpellcastingInPlay {
  return {
    slug,
    tradition,
    attribute: 'int',
    preparation: SpellPreparation.Prepared,
    origin: ORIGIN,
    slots: { ranks: ranks.map((rank) => ({ rank, count: 1 })) },
    pools: [],
    signatures: false,
    focusSpells: [],
    deitySpells: false,
  } as unknown as SpellcastingInPlay;
}

const STAFF_ID = InventoryItemId.parse('11111111-1111-4111-8111-111111111111');

function staff(carry: object): InventoryItem {
  return InventoryItemSchema.parse({
    id: STAFF_ID,
    item: itemFixtureId(ItemFixture.FireStaff),
    quantity: ItemQuantity.parse(1),
    carry,
  });
}

const NONE = StaffChargesSchema.parse({});
const HELD = { state: 'held', hands: 1 };

describe('staffSources', () => {
  test('lists a held staff with its spells by rank and what each costs', () => {
    const [source] = staffSources({
      inventory: [staff(HELD)],
      items,
      spells,
      entries: [entry('wizard', 'arcane', [1, 2, 3])],
      charges: NONE,
    });
    expect(source?.spells.map(({ id, rank, charges, problem }) => ({ id, rank, charges, problem }))).toEqual([
      { id: staffSpellId('ignition'), rank: STAFF_CANTRIP, charges: 0, problem: undefined },
      { id: staffSpellId('breathe-fire'), rank: 1, charges: 1, problem: undefined },
      { id: staffSpellId('floating-flame'), rank: 3, charges: 3, problem: undefined },
      { id: staffSpellId('fireball'), rank: 3, charges: 3, problem: undefined },
    ]);
  });

  test('includes a worn staff and leaves out a stowed or dropped one', () => {
    const entries = [entry('wizard', 'arcane', [1])];
    expect(staffSources({ inventory: [staff({ state: 'worn' })], items, spells, entries, charges: NONE })).toHaveLength(
      1,
    );
    expect(staffSources({ inventory: [staff({ state: 'stowed' })], items, spells, entries, charges: NONE })).toEqual(
      [],
    );
    expect(staffSources({ inventory: [staff({ state: 'dropped' })], items, spells, entries, charges: NONE })).toEqual(
      [],
    );
  });

  test('leaves out an item that is not a staff', () => {
    const rope = InventoryItemSchema.parse({
      id: STAFF_ID,
      item: itemFixtureId(ItemFixture.Rope),
      quantity: ItemQuantity.parse(1),
      carry: HELD,
    });
    expect(
      staffSources({ inventory: [rope], items, spells, entries: [entry('wizard', 'arcane', [1])], charges: NONE }),
    ).toEqual([]);
  });

  test('marks a spell above the highest rank the holder casts, with the reason', () => {
    const [source] = staffSources({
      inventory: [staff(HELD)],
      items,
      spells,
      entries: [entry('wizard', 'arcane', [1, 2])],
      charges: NONE,
    });
    expect(source?.spells.map(({ problem }) => problem)).toEqual([
      undefined,
      undefined,
      StaffSpellProblem.RankTooHigh,
      StaffSpellProblem.RankTooHigh,
    ]);
  });

  test("marks a spell no entry's tradition lists, with the reason", () => {
    const [source] = staffSources({
      inventory: [staff(HELD)],
      items,
      spells,
      entries: [entry('druid', 'primal', [1, 2, 3])],
      charges: NONE,
    });
    expect(source?.spells.map(({ problem }) => problem)).toEqual([
      StaffSpellProblem.NotOnList,
      undefined,
      undefined,
      undefined,
    ]);
  });

  test('lets a cantrip through on the list alone, even for an entry with no slots', () => {
    const [source] = staffSources({
      inventory: [staff(HELD)],
      items,
      spells,
      entries: [entry('wizard', 'arcane', [])],
      charges: NONE,
    });
    expect(source?.spells.at(0)?.problem).toBeUndefined();
  });

  test('picks the entry that can cast the spell, not the first that lists it', () => {
    const entries = [entry('low', 'arcane', [1]), entry('high', 'primal', [3])];
    const [source] = staffSources({ inventory: [staff(HELD)], items, spells, entries, charges: NONE });
    expect(source?.spells.at(3)?.entry?.slug).toBe('high');
  });

  test('marks every spell unavailable for a holder with no spellcasting', () => {
    const [source] = staffSources({ inventory: [staff(HELD)], items, spells, entries: [], charges: NONE });
    expect(source?.spells.every(({ problem }) => problem === StaffSpellProblem.NotOnList)).toBe(true);
  });

  test('reports the charges left of the prepared staff and none for another', () => {
    const entries = [entry('wizard', 'arcane', [3])];
    const prepared = StaffChargesSchema.parse({ [STAFF_ID]: { max: 4, spent: 1 } });
    expect(
      staffSources({ inventory: [staff(HELD)], items, spells, entries, charges: prepared }).at(0)?.charges,
    ).toEqual({ left: 3, max: 4 });
    expect(
      staffSources({ inventory: [staff(HELD)], items, spells, entries, charges: NONE }).at(0)?.charges,
    ).toBeUndefined();
  });
});
