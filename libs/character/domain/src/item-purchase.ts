import type { CopperValue } from '@pioneer/rules/sdk';

import { CharacterPatchField } from './character-patch';
import type { CharacterPatch } from './character-patch';
import { addItem } from './inventory';
import type { Inventory, InventoryItemId } from './inventory';
import { payCost } from './purse';

/** What the caller works out for an edit: the id an added item takes, and what a purchase costs (`purchaseCost`). */
export interface EditInputs {
  readonly newItemId?: InventoryItemId | undefined;
  readonly cost?: CopperValue | undefined;
}

/** The edits that add an item from content: a gift, or a purchase. */
export type AddPatch = Extract<
  CharacterPatch,
  { readonly field: typeof CharacterPatchField.GiftItem | typeof CharacterPatchField.BuyItem }
>;

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
  if (patch.field === CharacterPatchField.GiftItem) {
    return added;
  }
  const coins = cost === undefined ? undefined : payCost(inventory.coins, cost);
  if (coins === undefined) {
    throw new TypeError('A purchase needs the cost its caller works out, and coins that cover it');
  }
  return { ...added, coins };
}
