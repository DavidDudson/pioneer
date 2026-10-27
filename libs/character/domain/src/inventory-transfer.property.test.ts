import { describe, expect, test } from 'bun:test';

import { assert, nat, pre, property, record } from 'fast-check';

import { CoinsSchema, InventorySchema } from './inventory';
import type { Coins, Inventory, InventoryItem } from './inventory';
import { giveCoins, giveLine, TransferRefusal } from './inventory-transfer';
import type { InventoryTransfer } from './inventory-transfer';
import { inventory } from './testing';

const purse = record({ pp: nat(500), gp: nat(500), sp: nat(500), cp: nat(500) }).map((each) => CoinsSchema.parse(each));

interface Moved {
  readonly giver: Inventory;
  readonly recipient: Inventory;
}

/** The two inventories after a transfer that went ahead. */
function moved(transfer: InventoryTransfer): Moved {
  if (transfer.refusal !== undefined) {
    throw new Error(`Transfer refused: ${transfer.refusal}`);
  }
  return transfer;
}

/** The line at `index` of a non-empty inventory, wrapping round. */
function pick(stock: Inventory, index: number): InventoryItem {
  const line = stock.items[index % stock.items.length];
  if (line === undefined) {
    throw new Error('pick needs a non-empty inventory');
  }
  return line;
}

/** The coins of each denomination the two inventories hold between them. */
function coinTotals(giver: Inventory, recipient: Inventory): readonly number[] {
  const [left, right] = [giver.coins, recipient.coins];
  return [left.pp + right.pp, left.gp + right.gp, left.sp + right.sp, left.cp + right.cp];
}

/** The ids of every line the two inventories hold between them, sorted. */
function lineIds(giver: Inventory, recipient: Inventory): readonly string[] {
  return [...giver.items, ...recipient.items].map((each) => each.id).toSorted();
}

/** `left` and `right` together, denomination by denomination. */
function coinsPlus(left: Coins, right: Coins): Coins {
  return CoinsSchema.parse({
    pp: left.pp + right.pp,
    gp: left.gp + right.gp,
    sp: left.sp + right.sp,
    cp: left.cp + right.cp,
  });
}

function withCoins(coins: Coins): Inventory {
  return { ...InventorySchema.parse({}), coins };
}

describe('inventory transfers (properties)', () => {
  test('giving a line leaves the lines across both characters unchanged, and the giver valid', () => {
    assert(
      property(inventory, inventory, nat(), (giver, recipient, index) => {
        pre(giver.items.length > 0);
        const transfer = giveLine(giver, recipient, pick(giver, index).id);
        pre(transfer.refusal === undefined);
        const after = moved(transfer);
        expect(lineIds(after.giver, after.recipient)).toStrictEqual(lineIds(giver, recipient));
        expect(coinTotals(after.giver, after.recipient)).toStrictEqual(coinTotals(giver, recipient));
        expect(InventorySchema.safeParse(after.giver).success).toBe(true);
      }),
    );
  });

  test('giving coins leaves the coins across both characters unchanged, denomination by denomination', () => {
    assert(
      property(purse, purse, purse, (held, kept, offered) => {
        const transfer = giveCoins(withCoins(held), withCoins(kept), offered);
        pre(transfer.refusal === undefined);
        const after = moved(transfer);
        expect(coinTotals(after.giver, after.recipient)).toStrictEqual(coinTotals(withCoins(held), withCoins(kept)));
        expect(after.recipient.coins).toStrictEqual(coinsPlus(kept, offered));
      }),
    );
  });

  test('coins the giver does not hold are refused whole', () => {
    assert(
      property(purse, purse, (held, kept) => {
        const offered = CoinsSchema.parse({ cp: held.cp + 1 });

        const transfer = giveCoins(withCoins(held), withCoins(kept), offered);

        expect(transfer.refusal).toBe(TransferRefusal.ShortCoins);
      }),
    );
  });
});
