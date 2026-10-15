import type { ContentId } from '@pioneer/rules/sdk';

import { CharacterPatchField, isKitPatch, isUntargetedPatch } from './character-patch';
import type { CharacterPatch, KitPatch, UntargetedPatch } from './character-patch';
import type { InventoryItemId } from './inventory';
import type { Carry } from './item-carry';
import { RuneAction } from './rune-edits';
import type { RuneEdit } from './rune-edits';

/**
 * What an inventory edit touches, for the refusals: the item it changes, the content or kit it adds, where it stows
 * it, how it carries it, whether it invests it, and the rune it etches, erases or moves (and where to).
 */
export interface InventoryTarget {
  readonly id?: InventoryItemId | undefined;
  readonly item?: ContentId | undefined;
  readonly kit?: ContentId | undefined;
  readonly container?: InventoryItemId | undefined;
  readonly carry?: Carry | undefined;
  readonly invested?: boolean | undefined;
  readonly to?: InventoryItemId | undefined;
  readonly rune?: RuneEdit | undefined;
}

/** The rune edits. */
type RunePatch = Extract<
  CharacterPatch,
  {
    readonly field:
      | typeof CharacterPatchField.EtchRune
      | typeof CharacterPatchField.EraseRune
      | typeof CharacterPatchField.TransferRune;
  }
>;

/** What a rune edit touches: the item, the rune edit as `runeRefusal` reads it, and the item a rune moves onto. */
function runeTarget(patch: RunePatch): InventoryTarget {
  switch (patch.field) {
    case CharacterPatchField.EtchRune: {
      return {
        id: patch.id,
        rune: { action: RuneAction.Etch, id: patch.id, rune: patch.rune },
      };
    }
    case CharacterPatchField.EraseRune: {
      return {
        id: patch.id,
        rune: { action: RuneAction.Erase, id: patch.id, rune: patch.rune },
      };
    }
    case CharacterPatchField.TransferRune: {
      const { id, to, rune } = patch;
      return { id, to, rune: { action: RuneAction.Transfer, id, to, rune } };
    }
    default: {
      return patch satisfies never;
    }
  }
}

/** What an edit that is neither a kit nor untargeted touches in the inventory. */
function itemTarget(patch: Exclude<CharacterPatch, KitPatch | UntargetedPatch>): InventoryTarget {
  switch (patch.field) {
    case CharacterPatchField.GiftItem:
    case CharacterPatchField.BuyItem: {
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
    case CharacterPatchField.EtchRune:
    case CharacterPatchField.EraseRune:
    case CharacterPatchField.TransferRune: {
      return runeTarget(patch);
    }
    case CharacterPatchField.SetItemBroken:
    case CharacterPatchField.RemoveItem:
    case CharacterPatchField.SetItemQuantity:
    case CharacterPatchField.RenameItem: {
      return { id: patch.id };
    }
    case CharacterPatchField.SetCoins: {
      return {};
    }
    default: {
      return patch satisfies never;
    }
  }
}

/** What `patch` touches in the inventory; undefined for an edit outside it. Coins touch no item. */
export function inventoryTarget(patch: CharacterPatch): InventoryTarget | undefined {
  if (isKitPatch(patch)) {
    return { kit: patch.kit, container: patch.container };
  }
  return isUntargetedPatch(patch) ? undefined : itemTarget(patch);
}
