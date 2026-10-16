import {
  blockProblem,
  breakItem,
  conditionAfterBlock,
  heldShields,
  isShieldCommand,
  itemContent,
  removeItem,
  ShieldCondition,
  ShieldProblem,
  shieldContent,
} from '@pioneer/character/domain';
import type { Character, Inventory, PlayEdit, PlayState, ShieldContent } from '@pioneer/character/domain';
import { HitPoints } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { message, ValidationError } from '@pioneer/shared/kernel';

const NONE = HitPoints.parse(0);

/** A block to answer for: the edit, and the shields the character holds. */
export interface Block {
  readonly command: PlayEdit;
  readonly shields: ShieldContent;
}

/** The message each refused block answers with. */
const SHIELD_MESSAGES = {
  [ShieldProblem.NotHeld]: 'character.validation.shieldNotHeld',
  [ShieldProblem.Broken]: 'character.validation.shieldBroken',
} as const satisfies Record<ShieldProblem, string>;

/** The shields the character holds, with the Hardness and Hit Points the server's content gives them. */
export function shieldsOf(character: Character, registry: ContentRegistry): ShieldContent {
  return shieldContent(heldShields(character.document.inventory, itemContent(registry)));
}

/** Refuses a block with a shield the character does not hold, or one that is broken. */
export function checkShield(play: PlayState, command: PlayEdit, shields: ShieldContent): void {
  const problem = isShieldCommand(command) ? blockProblem(shields, play.shields, command.item) : undefined;
  if (problem !== undefined) {
    throw new ValidationError([{ path: ['command'], message: message(SHIELD_MESSAGES[problem]) }]);
  }
}

/**
 * The inventory after a block: the shield marked broken once it falls to its Broken Threshold, or removed when it is
 * destroyed. Undefined when the inventory stays as it is.
 */
export function shieldInventoryAfter(inventory: Inventory, before: PlayState, block: Block): Inventory | undefined {
  const { command, shields } = block;
  const stats = isShieldCommand(command) ? shields.get(command.item) : undefined;
  if (!isShieldCommand(command) || stats === undefined) {
    return undefined;
  }
  const { item, damage } = command;
  const condition = conditionAfterBlock(stats, before.shields[item] ?? NONE, damage.taken);
  switch (condition) {
    case ShieldCondition.Whole: {
      return undefined;
    }
    case ShieldCondition.Broken: {
      return breakItem(inventory, item, true);
    }
    case ShieldCondition.Destroyed: {
      return removeItem(inventory, item);
    }
    default: {
      return condition satisfies never;
    }
  }
}
