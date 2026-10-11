import { ChoiceValue, ContentId, SlotKey } from '@pioneer/rules/sdk';
import { Version } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CharacterLevel, CharacterName } from './character-fields';
import { CoinsSchema, InventoryItemId, InventoryItemName, ItemQuantity } from './inventory';
import { CarrySchema } from './item-carry';
import type { Carry } from './item-carry';

/** Every edit the sheet makes: a field, a choice slot or the inventory. One PATCH per edit. */
export const CharacterPatchField = {
  Name: 'name',
  Level: 'level',
  /** Pick an option in any slot the engine offers. */
  SelectSlot: 'selectSlot',
  ClearSlot: 'clearSlot',
  /** An item from content joins the inventory, loose or in a container; the server gives it its id. */
  AddItem: 'addItem',
  /** An item leaves the inventory; what it held moves out to where it was. */
  RemoveItem: 'removeItem',
  SetItemQuantity: 'setItemQuantity',
  /** An item goes into a container, or out of one when `container` is absent. */
  MoveItem: 'moveItem',
  /** The player's name for an item, or the content's again when `name` is absent. */
  RenameItem: 'renameItem',
  /** How an item is carried: worn, held in one or two hands, stowed or dropped. */
  CarryItem: 'carryItem',
  /** An item is invested, or no longer is. */
  InvestItem: 'investItem',
  SetCoins: 'setCoins',
} as const;
export type CharacterPatchField = ValueOf<typeof CharacterPatchField>;

export const CharacterPatchSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(CharacterPatchField.Name), value: CharacterName }),
  z.object({ field: z.literal(CharacterPatchField.Level), value: CharacterLevel }),
  z.object({ field: z.literal(CharacterPatchField.SelectSlot), slot: SlotKey, selection: ChoiceValue }),
  z.object({ field: z.literal(CharacterPatchField.ClearSlot), slot: SlotKey }),
  z.object({
    field: z.literal(CharacterPatchField.AddItem),
    item: ContentId,
    quantity: ItemQuantity,
    container: InventoryItemId.optional(),
  }),
  z.object({ field: z.literal(CharacterPatchField.RemoveItem), id: InventoryItemId }),
  z.object({ field: z.literal(CharacterPatchField.SetItemQuantity), id: InventoryItemId, quantity: ItemQuantity }),
  z.object({
    field: z.literal(CharacterPatchField.MoveItem),
    id: InventoryItemId,
    container: InventoryItemId.optional(),
  }),
  z.object({
    field: z.literal(CharacterPatchField.RenameItem),
    id: InventoryItemId,
    name: InventoryItemName.optional(),
  }),
  z.object({ field: z.literal(CharacterPatchField.CarryItem), id: InventoryItemId, carry: CarrySchema }),
  z.object({ field: z.literal(CharacterPatchField.InvestItem), id: InventoryItemId, invested: z.boolean() }),
  z.object({ field: z.literal(CharacterPatchField.SetCoins), coins: CoinsSchema }),
]);
export type CharacterPatch = z.infer<typeof CharacterPatchSchema>;

/** PATCH body: the edit plus the version the client last saw. */
export const PatchCharacterBody = z.object({
  expectedVersion: Version,
  patch: CharacterPatchSchema,
});
export type PatchCharacterBody = z.infer<typeof PatchCharacterBody>;

/** The edits that change what the inventory holds, apart from how items are carried. */
export type InventoryPatch = Exclude<
  CharacterPatch,
  {
    readonly field:
      | typeof CharacterPatchField.Name
      | typeof CharacterPatchField.Level
      | typeof CharacterPatchField.SelectSlot
      | typeof CharacterPatchField.ClearSlot
      | typeof CharacterPatchField.CarryItem
      | typeof CharacterPatchField.InvestItem;
  }
>;

/**
 * What an inventory edit touches, for the refusals: the item it changes, the content it adds, where it stows it, how
 * it carries it and whether it invests it.
 */
export interface InventoryTarget {
  readonly id?: InventoryItemId | undefined;
  readonly item?: ContentId | undefined;
  readonly container?: InventoryItemId | undefined;
  readonly carry?: Carry | undefined;
  readonly invested?: boolean | undefined;
}

/** What `patch` touches in the inventory; undefined for an edit outside it. Coins touch no item. */
export function inventoryTarget(patch: CharacterPatch): InventoryTarget | undefined {
  switch (patch.field) {
    case CharacterPatchField.AddItem: {
      return { item: patch.item, container: patch.container };
    }
    case CharacterPatchField.MoveItem: {
      return { id: patch.id, container: patch.container };
    }
    case CharacterPatchField.CarryItem: {
      return { id: patch.id, carry: patch.carry };
    }
    case CharacterPatchField.InvestItem: {
      return { id: patch.id, invested: patch.invested };
    }
    case CharacterPatchField.RemoveItem:
    case CharacterPatchField.SetItemQuantity:
    case CharacterPatchField.RenameItem: {
      return { id: patch.id };
    }
    case CharacterPatchField.SetCoins: {
      return {};
    }
    case CharacterPatchField.Name:
    case CharacterPatchField.Level:
    case CharacterPatchField.SelectSlot:
    case CharacterPatchField.ClearSlot: {
      return undefined;
    }
    default: {
      const unreachable: never = patch;
      throw new TypeError(`Unhandled character patch: ${JSON.stringify(unreachable)}`);
    }
  }
}
