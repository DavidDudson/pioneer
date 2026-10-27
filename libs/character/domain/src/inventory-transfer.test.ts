import { describe, expect, test } from 'bun:test';

import { newId } from '@pioneer/shared/kernel';

import { CoinsSchema, INVENTORY_ITEMS_MAX, InventoryItemId, InventorySchema, ItemQuantity } from './inventory';
import type { Inventory, InventoryItem } from './inventory';
import { giveLine, TransferRefusal } from './inventory-transfer';
import { CarryState, STOWED } from './item-carry';
import { KeyItemId } from './key-item-id';
import { itemFixtureId, ItemFixture } from './testing';

const QUANTITY = ItemQuantity.parse(1);
const pack = InventoryItemId.parse(newId());
const rope = InventoryItemId.parse(newId());
const torch = InventoryItemId.parse(newId());
const other = InventoryItemId.parse(newId());

function line(id: InventoryItemId, rest: Partial<InventoryItem> = {}): InventoryItem {
  return { id, item: itemFixtureId(ItemFixture.Rope), quantity: QUANTITY, carry: STOWED, ...rest };
}

function stock(items: readonly InventoryItem[]): Inventory {
  return { items, coins: CoinsSchema.parse({}) };
}

describe('giveLine', () => {
  test('a container goes with what it holds, and arrives loose and stowed', () => {
    const giver = stock([line(pack), line(rope, { container: pack }), line(torch, { container: rope }), line(other)]);

    const given = giveLine(giver, stock([]), pack);

    expect(given.refusal).toBeUndefined();
    expect(given).toMatchObject({ giver: { items: [{ id: other }] } });
    expect(given).toMatchObject({
      recipient: { items: [{ id: pack }, { id: rope, container: pack }, { id: torch, container: rope }] },
    });
  });

  test('a line arrives stowed and not invested, and a line the giver lacks is refused', () => {
    const worn = line(pack, { carry: { state: CarryState.Worn }, invested: true });

    const given = giveLine(stock([worn]), stock([]), pack);
    const missing = giveLine(stock([worn]), stock([]), other);

    expect(given).toMatchObject({ recipient: { items: [{ id: pack, carry: STOWED }] } });
    expect(JSON.stringify(given)).not.toContain('invested');
    expect(missing).toStrictEqual({ refusal: TransferRefusal.NoLine });
  });

  test('a key item, or a container holding one, cannot be given', () => {
    const keyed = line(rope, { keyItem: KeyItemId.parse(newId()) });

    const alone = giveLine(stock([keyed]), stock([]), rope);
    const inside = giveLine(stock([line(pack), { ...keyed, container: pack }]), stock([]), pack);

    expect([alone.refusal, inside.refusal]).toStrictEqual([TransferRefusal.KeyItem, TransferRefusal.KeyItem]);
  });

  test('a recipient with no room is refused', () => {
    const full = stock(Array.from({ length: INVENTORY_ITEMS_MAX }, () => line(InventoryItemId.parse(newId()))));

    const given = giveLine(stock([line(pack)]), full, pack);

    expect(given).toStrictEqual({ refusal: TransferRefusal.Full });
    expect(InventorySchema.safeParse(full).success).toBe(true);
  });
});
