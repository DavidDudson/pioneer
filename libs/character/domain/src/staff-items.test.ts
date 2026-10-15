import { describe, expect, test } from 'bun:test';

import { Charges, STAFF_CANTRIP, StaffRank } from '@pioneer/rules/sdk';

import { InventoryItemId, InventoryItemSchema, ItemQuantity } from './inventory';
import type { InventoryItem } from './inventory';
import { isStaff, staffSpells, staffSpellsOf } from './staff-items';
import { ItemFixture, itemFixtureContent, itemFixtureId, staffSpellId } from './testing';

const content = itemFixtureContent();

function carried(name: ItemFixture): InventoryItem {
  return InventoryItemSchema.parse({
    id: InventoryItemId.parse('11111111-1111-4111-8111-111111111111'),
    item: itemFixtureId(name),
    quantity: ItemQuantity.parse(1),
  });
}

describe('staffSpells', () => {
  test("lists a staff's spells by rank, with what casting each costs", () => {
    expect(staffSpells(carried(ItemFixture.FireStaff), content)).toEqual([
      { spell: staffSpellId('ignition'), rank: STAFF_CANTRIP, charges: Charges.parse(0) },
      { spell: staffSpellId('breathe-fire'), rank: StaffRank.parse(1), charges: Charges.parse(1) },
      { spell: staffSpellId('floating-flame'), rank: StaffRank.parse(3), charges: Charges.parse(3) },
      { spell: staffSpellId('fireball'), rank: StaffRank.parse(3), charges: Charges.parse(3) },
    ]);
  });

  test('is undefined for an item that is not a staff', () => {
    expect(staffSpells(carried(ItemFixture.Longsword), content)).toBeUndefined();
    expect(staffSpells(carried(ItemFixture.Rope), content)).toBeUndefined();
    expect(staffSpells(carried(ItemFixture.HealingPotion), content)).toBeUndefined();
  });

  test('is undefined for content the packs do not hold', () => {
    expect(staffSpellsOf(undefined)).toBeUndefined();
  });
});

describe('isStaff', () => {
  test('is true for an item with typed staff spells only', () => {
    expect(isStaff(carried(ItemFixture.FireStaff), content)).toBe(true);
    expect(isStaff(carried(ItemFixture.Longsword), content)).toBe(false);
  });
});
