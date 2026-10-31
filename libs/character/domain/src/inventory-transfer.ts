import { Coin } from '@pioneer/rules/sdk';

import { CoinsSchema, INVENTORY_ITEMS_MAX } from './inventory';
import type { Coins, Inventory, InventoryItem, InventoryItemId } from './inventory';
import { STOWED } from './item-carry';

/** Why a transfer between two inventories cannot go ahead. */
export const TransferRefusal = {
  /** The giver no longer has the line. */
  NoLine: 'no-line',
  /** The line, or something inside it, is a campaign's key item, which a member cannot give away. */
  KeyItem: 'key-item',
  /** The recipient has no room for the line and what it holds. */
  Full: 'full',
  /** The giver holds fewer coins than the offer, in some denomination. */
  ShortCoins: 'short-coins',
} as const;
export type TransferRefusal = (typeof TransferRefusal)[keyof typeof TransferRefusal];

/** Both inventories after a transfer, or the reason it cannot happen. */
export type InventoryTransfer =
  | { readonly refusal: undefined; readonly giver: Inventory; readonly recipient: Inventory }
  | { readonly refusal: TransferRefusal };

const COINS = [Coin.Platinum, Coin.Gold, Coin.Silver, Coin.Copper] as const;

/** The line `id` and everything inside it, however deep. */
export function lineWithContents(items: readonly InventoryItem[], id: InventoryItemId): readonly InventoryItem[] {
  const taken = new Set<InventoryItemId>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const each of items) {
      if (each.container !== undefined && taken.has(each.container) && !taken.has(each.id)) {
        taken.add(each.id);
        grew = true;
      }
    }
  }
  return items.filter((each) => taken.has(each.id));
}

/** A line as the recipient first has it: stowed and not invested, still with its runes, name and quantity. */
function received(line: InventoryItem, root: InventoryItemId): InventoryItem {
  const { invested: _worn, container, ...rest } = line;
  const base = { ...rest, carry: STOWED };
  return line.id === root || container === undefined ? base : { ...base, container };
}

/**
 * `id` and what it holds, moved from the giver's inventory to the recipient's, stowed loose. Nothing is lost or
 * duplicated: every line the giver loses the recipient gains.
 */
export function giveLine(giver: Inventory, recipient: Inventory, id: InventoryItemId): InventoryTransfer {
  if (!giver.items.some((each) => each.id === id)) {
    return { refusal: TransferRefusal.NoLine };
  }
  const moved = lineWithContents(giver.items, id);
  if (moved.some((each) => each.keyItem !== undefined)) {
    return { refusal: TransferRefusal.KeyItem };
  }
  if (recipient.items.length + moved.length > INVENTORY_ITEMS_MAX) {
    return { refusal: TransferRefusal.Full };
  }
  const left = new Set(moved.map((each) => each.id));
  return {
    refusal: undefined,
    giver: { ...giver, items: giver.items.filter((each) => !left.has(each.id)) },
    recipient: { ...recipient, items: [...recipient.items, ...moved.map((each) => received(each, id))] },
  };
}

/** `held` with `coins` added to it, denomination by denomination. */
function plus(held: Coins, coins: Coins): Coins {
  return CoinsSchema.parse({
    [Coin.Platinum]: held[Coin.Platinum] + coins[Coin.Platinum],
    [Coin.Gold]: held[Coin.Gold] + coins[Coin.Gold],
    [Coin.Silver]: held[Coin.Silver] + coins[Coin.Silver],
    [Coin.Copper]: held[Coin.Copper] + coins[Coin.Copper],
  });
}

/** `held` with `coins` taken from it; the caller has checked it holds them. */
function minus(held: Coins, coins: Coins): Coins {
  return CoinsSchema.parse({
    [Coin.Platinum]: held[Coin.Platinum] - coins[Coin.Platinum],
    [Coin.Gold]: held[Coin.Gold] - coins[Coin.Gold],
    [Coin.Silver]: held[Coin.Silver] - coins[Coin.Silver],
    [Coin.Copper]: held[Coin.Copper] - coins[Coin.Copper],
  });
}

/** `coins` moved from the giver's purse to the recipient's, denomination by denomination. */
export function giveCoins(giver: Inventory, recipient: Inventory, coins: Coins): InventoryTransfer {
  if (COINS.some((each) => giver.coins[each] < coins[each])) {
    return { refusal: TransferRefusal.ShortCoins };
  }
  return {
    refusal: undefined,
    giver: { ...giver, coins: minus(giver.coins, coins) },
    recipient: { ...recipient, coins: plus(recipient.coins, coins) },
  };
}
