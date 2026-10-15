import { CharacterPatchField } from './character-patch';
import type { CharacterPatch } from './character-patch';
import { carryItem, investItem } from './inventory';
import type { Inventory } from './inventory';
import { breakItem } from './inventory-broken';
import { eraseRune, etchRune, transferRune } from './rune-edits';

/** The edits that change how an item is equipped: how it is carried, whether it is invested or broken, and its runes. */
export type EquipmentPatch = Extract<
  CharacterPatch,
  {
    readonly field:
      | typeof CharacterPatchField.CarryItem
      | typeof CharacterPatchField.InvestItem
      | typeof CharacterPatchField.SetItemBroken
      | typeof CharacterPatchField.EtchRune
      | typeof CharacterPatchField.EraseRune
      | typeof CharacterPatchField.TransferRune;
  }
>;

/** `inventory` with an equipment edit made. */
export function equipmentChange(inventory: Inventory, patch: EquipmentPatch): Inventory {
  switch (patch.field) {
    case CharacterPatchField.CarryItem: {
      return carryItem(inventory, patch.id, patch.carry);
    }
    case CharacterPatchField.InvestItem: {
      return investItem(inventory, patch.id, patch.invested);
    }
    case CharacterPatchField.SetItemBroken: {
      return breakItem(inventory, patch.id, patch.broken);
    }
    case CharacterPatchField.EtchRune: {
      return etchRune(inventory, patch.id, patch.rune);
    }
    case CharacterPatchField.EraseRune: {
      return eraseRune(inventory, patch.id, patch.rune);
    }
    case CharacterPatchField.TransferRune: {
      return transferRune(inventory, {
        from: patch.id,
        to: patch.to,
        rune: patch.rune,
      });
    }
    default: {
      return patch satisfies never;
    }
  }
}
