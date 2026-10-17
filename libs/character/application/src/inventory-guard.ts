import {
  inventoryRefusal,
  inventoryTarget,
  itemContent,
  itemRefusal,
  kitContent,
  kitRefusal,
  runeContent,
  runeRefusal,
  storableLimits,
} from '@pioneer/character/domain';
import type {
  Character,
  CharacterPatch,
  Inventory,
  InventoryRefusal,
  InventoryTarget,
  RuleLimits,
} from '@pioneer/character/domain';
import type { ContentRegistry, ContentSource } from '@pioneer/rules/sdk';
import { ValidationError } from '@pioneer/shared/kernel';

/** Throws a refused inventory edit as a 422 on the patch field it blames. */
function refuse(refusal: InventoryRefusal | undefined): void {
  if (refusal !== undefined) {
    throw new ValidationError([{ path: ['patch', refusal.field], message: refusal.message }]);
  }
}

/** The first refusal content gives `target`: its kit (`kitRefusal`), its item (`itemRefusal`), then its rune. */
function contentRefusal(
  { registry, limits }: { readonly registry: ContentRegistry; readonly limits: RuleLimits },
  inventory: Inventory,
  target: InventoryTarget,
): InventoryRefusal | undefined {
  const items = itemContent(registry);
  const kit =
    target.kit === undefined
      ? undefined
      : kitRefusal({ kits: kitContent(registry), items, limits }, inventory, target.kit);
  const rune =
    target.rune === undefined
      ? undefined
      : runeRefusal({ items, runes: runeContent(registry), limits }, inventory, target.rune);
  return kit ?? itemRefusal(items, inventory, target) ?? rune;
}

/**
 * Refuses an edit to an item the character hasn't, an item past the limit, a kit no loaded pack has, holding an item
 * none has or past the limit (`kitRefusal`), holding more than two hands hold, an investment past the limit, a move
 * that would put a container inside itself, content no loaded pack has as an item, stowing in an item that holds
 * nothing, carrying an item in a way its content isn't carried, investing an item that isn't invested, and a rune the
 * rules don't allow etched, erased or moved there (`runeRefusal`). Other edits pass untouched; content is loaded only
 * for an edit that names an item, a kit or a container, carries or invests one, or changes its runes. The limits are the
 * table's, held to what the schema stores (`storableLimits`); absent means the core rules'.
 */
export async function assertInventoryAllows(
  character: Character,
  patch: CharacterPatch,
  { content, tableLimits }: { readonly content: ContentSource; readonly tableLimits?: RuleLimits },
): Promise<void> {
  const target = inventoryTarget(patch);
  if (target === undefined) {
    return;
  }
  const { inventory } = character.document;
  const limits = storableLimits(tableLimits);
  refuse(inventoryRefusal(inventory, target, limits));
  const readsContent = [target.item, target.kit, target.container, target.carry, target.invested, target.rune].some(
    (each) => each !== undefined,
  );
  if (!readsContent) {
    return;
  }
  const registry = await content.registry();
  refuse(contentRefusal({ registry, limits }, inventory, target));
}
