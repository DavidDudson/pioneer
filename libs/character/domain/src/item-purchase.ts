import type { CopperValue } from '@pioneer/rules/sdk';

import { CharacterPatchField } from './character-patch';
import type { CharacterPatch, KitPatch } from './character-patch';
import { addItem } from './inventory';
import type { Inventory, InventoryItemId, NewItem } from './inventory';
import { payCost } from './purse';

/**
 * What the caller works out for an edit: the id an added item takes, the lines an added kit expands into (`kitItems`),
 * what a purchase costs (`purchaseCost`), and whether a slot edit is a repertoire swap (`countsAsSwap`).
 */
export interface EditInputs {
  readonly newItemId?: InventoryItemId | undefined;
  readonly kitItems?: readonly NewItem[] | undefined;
  readonly cost?: CopperValue | undefined;
  /** The slot edit is the level's repertoire swap, which it records (#594). */
  readonly countsAsSwap?: boolean | undefined;
}

/** The edits that add an item from content: a gift, or a purchase. */
export type AddPatch = Extract<
  CharacterPatch,
  { readonly field: typeof CharacterPatchField.GiftItem | typeof CharacterPatchField.BuyItem }
>;

/** `inventory` with `cost` paid from its coins. A missing cost, or one the coins don't cover, is a caller's bug. */
function paid(inventory: Inventory, cost: CopperValue | undefined): Inventory {
  const coins = cost === undefined ? undefined : payCost(inventory.coins, cost);
  if (coins === undefined) {
    throw new TypeError('A purchase needs the cost its caller works out, and coins that cover it');
  }
  return { ...inventory, coins };
}

/**
 * `inventory` with the item `patch` adds, under the id the caller gave it; a purchase also pays its cost from the
 * coins in the same edit. A missing id, or a purchase with no cost or one the coins don't cover, is a caller's bug.
 */
export function withAddedItem(inventory: Inventory, patch: AddPatch, { newItemId, cost }: EditInputs): Inventory {
  if (newItemId === undefined) {
    throw new TypeError('An added item needs the id its caller gives it');
  }
  const { item, quantity, container } = patch;
  const added = addItem(inventory, { id: newItemId, item, quantity, container });
  return patch.field === CharacterPatchField.GiftItem ? added : paid(added, cost);
}

/**
 * `inventory` with the lines the caller expanded `patch`'s kit into; a purchase also pays the kit's cost from the coins
 * in the same edit. Missing lines, or a purchase with no cost or one the coins don't cover, is a caller's bug.
 */
export function withAddedKit(inventory: Inventory, patch: KitPatch, { kitItems, cost }: EditInputs): Inventory {
  if (kitItems === undefined) {
    throw new TypeError('An added kit needs the lines its caller expands it into');
  }
  let added = inventory;
  for (const line of kitItems) {
    added = addItem(added, line);
  }
  return patch.field === CharacterPatchField.GiftKit ? added : paid(added, cost);
}
