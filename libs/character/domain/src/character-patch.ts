import { ChoiceValue, ContentId, RichText, SlotKey } from '@pioneer/rules/sdk';
import { Version } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CharacterLevel, CharacterName } from './character-fields';
import { CoinsSchema, InventoryItemId, InventoryItemName, ItemQuantity } from './inventory';
import { CarrySchema } from './item-carry';
import { RuneEtchingSchema, RuneRefSchema } from './rune-etching';

/** Every edit the sheet makes: a field, a choice slot or the inventory. One PATCH per edit. */
export const CharacterPatchField = {
  Name: 'name',
  Level: 'level',
  /** Pick an option in any slot the engine offers. */
  SelectSlot: 'selectSlot',
  ClearSlot: 'clearSlot',
  /**
   * An item from content joins the inventory without paying (loot, a GM's reward, starting gear), loose or in a
   * container; the server gives it its id. Its audit rows name `giftItem`, apart from a purchase.
   */
  GiftItem: 'giftItem',
  /**
   * An item from content bought at its price times the quantity, paid from the coins with change made; refused when
   * the coins are worth less. Its audit rows name `buyItem`.
   */
  BuyItem: 'buyItem',
  /**
   * Every item in a kit joins the inventory without paying, loose or in a container, with what a container in the kit
   * holds inside it; the server gives each its id. Its audit rows name `giftKit`.
   */
  GiftKit: 'giftKit',
  /** A kit's items, as `giftKit` adds them, bought at the kit's price with change made. Its audit rows name `buyKit`. */
  BuyKit: 'buyKit',
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
  /** An item is marked broken, or repaired; a broken wand can't be cast. */
  SetItemBroken: 'setItemBroken',
  /** A rune etched onto a weapon, armour or a shield: a fundamental one at a grade, or a property one. */
  EtchRune: 'etchRune',
  /** An etched rune erased from an item. */
  EraseRune: 'eraseRune',
  /** An etched rune moved from one item onto another. */
  TransferRune: 'transferRune',
  SetCoins: 'setCoins',
  /** An uncommon or rare spell the character may prepare from now on. */
  GrantSpellAccess: 'grantSpellAccess',
  /** A spell the character no longer has access to; picks of it stay, invalid. */
  RevokeSpellAccess: 'revokeSpellAccess',
  /** An imported feat no slot took, taken off the list so it stops being flagged. */
  DismissUnplacedFeat: 'dismissUnplacedFeat',
  /** What the character looks like; empty rich text clears it. */
  SetAppearance: 'setAppearance',
  /** How the character acts and what they care about; empty rich text clears it. */
  SetPersonality: 'setPersonality',
} as const;
export type CharacterPatchField = ValueOf<typeof CharacterPatchField>;

export const CharacterPatchSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(CharacterPatchField.Name), value: CharacterName }),
  z.object({ field: z.literal(CharacterPatchField.Level), value: CharacterLevel }),
  z.object({ field: z.literal(CharacterPatchField.SelectSlot), slot: SlotKey, selection: ChoiceValue }),
  z.object({ field: z.literal(CharacterPatchField.ClearSlot), slot: SlotKey }),
  z.object({
    field: z.literal(CharacterPatchField.GiftItem),
    item: ContentId,
    quantity: ItemQuantity,
    container: InventoryItemId.optional(),
  }),
  z.object({
    field: z.literal(CharacterPatchField.BuyItem),
    item: ContentId,
    quantity: ItemQuantity,
    container: InventoryItemId.optional(),
  }),
  z.object({ field: z.literal(CharacterPatchField.GiftKit), kit: ContentId, container: InventoryItemId.optional() }),
  z.object({ field: z.literal(CharacterPatchField.BuyKit), kit: ContentId, container: InventoryItemId.optional() }),
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
  z.object({ field: z.literal(CharacterPatchField.SetItemBroken), id: InventoryItemId, broken: z.boolean() }),
  z.object({ field: z.literal(CharacterPatchField.EtchRune), id: InventoryItemId, rune: RuneEtchingSchema }),
  z.object({ field: z.literal(CharacterPatchField.EraseRune), id: InventoryItemId, rune: RuneRefSchema }),
  z.object({
    field: z.literal(CharacterPatchField.TransferRune),
    id: InventoryItemId,
    to: InventoryItemId,
    rune: RuneRefSchema,
  }),
  z.object({ field: z.literal(CharacterPatchField.SetCoins), coins: CoinsSchema }),
  z.object({ field: z.literal(CharacterPatchField.GrantSpellAccess), spell: ContentId }),
  z.object({ field: z.literal(CharacterPatchField.RevokeSpellAccess), spell: ContentId }),
  z.object({ field: z.literal(CharacterPatchField.DismissUnplacedFeat), feat: ContentId }),
  z.object({ field: z.literal(CharacterPatchField.SetAppearance), value: RichText }),
  z.object({ field: z.literal(CharacterPatchField.SetPersonality), value: RichText }),
]);
export type CharacterPatch = z.infer<typeof CharacterPatchSchema>;

/** PATCH body: the edit plus the version the client last saw. */
export const PatchCharacterBody = z.object({
  expectedVersion: Version,
  patch: CharacterPatchSchema,
});
export type PatchCharacterBody = z.infer<typeof PatchCharacterBody>;

/** The edits that grant or revoke access to a spell. */
export type SpellAccessPatch = Extract<
  CharacterPatch,
  { readonly field: typeof CharacterPatchField.GrantSpellAccess | typeof CharacterPatchField.RevokeSpellAccess }
>;

/** The edit that takes an imported feat off the list of those no slot holds. */
export type UnplacedFeatPatch = Extract<
  CharacterPatch,
  { readonly field: typeof CharacterPatchField.DismissUnplacedFeat }
>;

/** The edits that write the appearance or the personality. */
export type ProsePatch = Extract<
  CharacterPatch,
  { readonly field: typeof CharacterPatchField.SetAppearance | typeof CharacterPatchField.SetPersonality }
>;

/** The edits that touch no inventory item, kit, container or rune: a field, a slot, spell access or prose. */
export type UntargetedPatch = Extract<
  CharacterPatch,
  {
    readonly field:
      | typeof CharacterPatchField.Name
      | typeof CharacterPatchField.Level
      | typeof CharacterPatchField.SelectSlot
      | typeof CharacterPatchField.ClearSlot
      | typeof CharacterPatchField.GrantSpellAccess
      | typeof CharacterPatchField.RevokeSpellAccess
      | typeof CharacterPatchField.DismissUnplacedFeat
      | ProsePatch['field'];
  }
>;

const UNTARGETED_FIELDS: ReadonlySet<CharacterPatchField> = new Set<UntargetedPatch['field']>([
  CharacterPatchField.Name,
  CharacterPatchField.Level,
  CharacterPatchField.SelectSlot,
  CharacterPatchField.ClearSlot,
  CharacterPatchField.GrantSpellAccess,
  CharacterPatchField.RevokeSpellAccess,
  CharacterPatchField.DismissUnplacedFeat,
  CharacterPatchField.SetAppearance,
  CharacterPatchField.SetPersonality,
]);

export function isUntargetedPatch(patch: CharacterPatch): patch is UntargetedPatch {
  return UNTARGETED_FIELDS.has(patch.field);
}

/** The edits that change what the inventory holds, apart from how items are carried. */
export type InventoryPatch = Exclude<
  CharacterPatch,
  | UntargetedPatch
  | {
      readonly field:
        | typeof CharacterPatchField.CarryItem
        | typeof CharacterPatchField.InvestItem
        | typeof CharacterPatchField.SetItemBroken
        | typeof CharacterPatchField.EtchRune
        | typeof CharacterPatchField.EraseRune
        | typeof CharacterPatchField.TransferRune;
    }
>;

/** The edits that add a kit's items: a gift, or a purchase. */
export type KitPatch = Extract<
  CharacterPatch,
  { readonly field: typeof CharacterPatchField.GiftKit | typeof CharacterPatchField.BuyKit }
>;

const KIT_FIELDS: ReadonlySet<CharacterPatchField> = new Set<KitPatch['field']>([
  CharacterPatchField.GiftKit,
  CharacterPatchField.BuyKit,
]);

/** Whether `patch` adds a kit's items (`KitPatch`). */
export function isKitPatch(patch: CharacterPatch): patch is KitPatch {
  return KIT_FIELDS.has(patch.field);
}

const INVENTORY_FIELDS: ReadonlySet<CharacterPatchField> = new Set<InventoryPatch['field']>([
  CharacterPatchField.GiftItem,
  CharacterPatchField.BuyItem,
  CharacterPatchField.GiftKit,
  CharacterPatchField.BuyKit,
  CharacterPatchField.RemoveItem,
  CharacterPatchField.SetItemQuantity,
  CharacterPatchField.MoveItem,
  CharacterPatchField.RenameItem,
  CharacterPatchField.SetCoins,
]);

/** Whether `patch` changes what the inventory holds (`InventoryPatch`). */
export function isInventoryPatch(patch: CharacterPatch): patch is InventoryPatch {
  return INVENTORY_FIELDS.has(patch.field);
}
