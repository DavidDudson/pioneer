import {
  CharacterPatchField,
  InventoryItemId,
  isKitPatch,
  ItemQuantity,
  itemContent,
  kitContent,
  kitItems,
  payCost,
  purchaseCost,
} from '@pioneer/character/domain';
import type { Character, CharacterPatch, EditInputs, KitPatch } from '@pioneer/character/domain';
import type { ContentSource, CopperValue } from '@pioneer/rules/sdk';
import { message, newId, ValidationError } from '@pioneer/shared/kernel';

/** A fresh id for an item an edit adds. */
function newItemId(): InventoryItemId {
  return InventoryItemId.parse(newId());
}

/** A kit is bought one at a time, at its price. */
const ONE_KIT = ItemQuantity.parse(1);

/** Where a purchase the coins don't cover is refused, and why: an item's on its quantity, a kit's on the kit. */
interface Unaffordable {
  readonly field: string;
  readonly key: string;
}

const UNAFFORDABLE_ITEM: Unaffordable = { field: 'quantity', key: 'character.validation.cannotAfford' };
const UNAFFORDABLE_KIT: Unaffordable = { field: 'kit', key: 'character.validation.cannotAffordKit' };

/**
 * `cost`, once the character's coins are found to cover it; refused on its field, with its reason, when they are worth
 * less, so a character is never left in debt.
 */
function affordable(character: Character, cost: CopperValue, { field, key }: Unaffordable): CopperValue {
  if (payCost(character.document.inventory.coins, cost) === undefined) {
    throw new ValidationError([{ path: ['patch', field], message: message(key) }]);
  }
  return cost;
}

/** The lines a kit edit adds, each with a fresh id (`kitItems`), and what a bought kit costs at its price. */
async function kitInputs(content: ContentSource, character: Character, patch: KitPatch): Promise<EditInputs> {
  const registry = await content.registry();
  const kit = kitContent(registry).get(patch.kit);
  if (kit === undefined) {
    throw new TypeError(`Kit ${patch.kit} passed the refusals but is not loaded`);
  }
  const lines = kitItems(kit.data, patch.container, newItemId);
  if (patch.field === CharacterPatchField.GiftKit) {
    return { kitItems: lines };
  }
  const cost = purchaseCost(kit.data.price, ONE_KIT);
  return { kitItems: lines, cost: affordable(character, cost, UNAFFORDABLE_KIT) };
}

/**
 * What `patch` needs worked out before it applies: a fresh id for an added item, the lines an added kit expands into,
 * each with a fresh id, and what a purchase costs, refused when the coins are worth less. Run after
 * `assertInventoryAllows`, so the item or kit is one a loaded pack has.
 */
export async function editInputs(
  content: ContentSource,
  character: Character,
  patch: CharacterPatch,
): Promise<EditInputs> {
  if (isKitPatch(patch)) {
    return kitInputs(content, character, patch);
  }
  if (patch.field !== CharacterPatchField.BuyItem) {
    return { newItemId: newItemId() };
  }
  const registry = await content.registry();
  const cost = purchaseCost(itemContent(registry).get(patch.item)?.data.price, patch.quantity);
  return { newItemId: newItemId(), cost: affordable(character, cost, UNAFFORDABLE_ITEM) };
}
