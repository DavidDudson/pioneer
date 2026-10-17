import {
  consumableInventoryAfter,
  ConsumableProblem,
  consumableProblem,
  heldConsumable,
  isConsumableCommand,
  itemContent,
} from '@pioneer/character/domain';
import type { Character, ConsumableCommand, Inventory, PlayEdit } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { message, ValidationError } from '@pioneer/shared/kernel';

/** The message each refused use answers with. */
const CONSUMABLE_MESSAGES = {
  [ConsumableProblem.NotHeld]: 'character.validation.consumableNotHeld',
  [ConsumableProblem.WrongAction]: 'character.validation.consumableWrongAction',
  [ConsumableProblem.WrongEffect]: 'character.validation.consumableWrongEffect',
} as const satisfies Record<ConsumableProblem, string>;

/** Refuses a use of a consumable the character does not hold, or one the spend or the effect does not belong to. */
export function checkConsumable(character: Character, registry: ContentRegistry, command: ConsumableCommand): void {
  const held = heldConsumable(character.document.inventory, itemContent(registry), command.item);
  const problem = consumableProblem(command, held);
  if (problem !== undefined) {
    throw new ValidationError([{ path: ['command'], message: message(CONSUMABLE_MESSAGES[problem]) }]);
  }
}

/** The inventory after `command` uses a consumable: the stack down by one, or the item gone. Undefined for other edits. */
export function consumableInventory(inventory: Inventory, command: PlayEdit): Inventory | undefined {
  return isConsumableCommand(command) ? consumableInventoryAfter(inventory, command.item) : undefined;
}
