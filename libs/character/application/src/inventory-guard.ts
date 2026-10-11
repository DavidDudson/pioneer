import { inventoryRefusal, inventoryTarget, itemContent, itemRefusal } from '@pioneer/character/domain';
import type { Character, CharacterPatch, InventoryRefusal } from '@pioneer/character/domain';
import type { ContentSource } from '@pioneer/rules/sdk';
import { ValidationError } from '@pioneer/shared/kernel';

/** Throws a refused inventory edit as a 422 on the patch field it blames. */
function refuse(refusal: InventoryRefusal | undefined): void {
  if (refusal !== undefined) {
    throw new ValidationError([{ path: ['patch', refusal.field], message: refusal.message }]);
  }
}

/**
 * Refuses an edit to an item the character hasn't, an item past the limit, a move that would put a container inside
 * itself, content no loaded pack has as an item, and stowing in an item that holds nothing. Other edits pass
 * untouched; content is loaded only for an edit that names an item or a container.
 */
export async function assertInventoryAllows(
  character: Character,
  patch: CharacterPatch,
  content: ContentSource,
): Promise<void> {
  const target = inventoryTarget(patch);
  if (target === undefined) {
    return;
  }
  const { inventory } = character.document;
  refuse(inventoryRefusal(inventory, target));
  if (target.item === undefined && target.container === undefined) {
    return;
  }
  const registry = await content.registry();
  refuse(itemRefusal(itemContent(registry), inventory, target));
}
