import {
  characterGrants,
  characterSpellcasting,
  isShieldCommand,
  isWandCommand,
  itemContent,
  wandInventoryAfter,
  wandOutcome,
  WandOutcome,
  WandProblem,
  wandProblem,
  wandSources,
} from '@pioneer/character/domain';
import type {
  Character,
  CountedMaxima,
  PlayEdit,
  PlayState,
  SlotContent,
  WandCommand,
} from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { message, ValidationError } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';

import { WAND_MESSAGES } from './play-defaults';
import { checkShield, shieldInventoryAfter, shieldsOf } from './play-shield';

/** What an edit that can change the inventory reads: the character and its play state, and the content it plays by. */
export interface InventoryEdit {
  readonly character: Character;
  readonly play: PlayState;
  readonly registry: ContentRegistry;
  readonly slots: SlotContent;
  readonly counted: CountedMaxima;
  readonly now: Temporal.Instant;
}

/**
 * A wand cast or overcharge, checked against the wands the character holds. The character with the wand marked broken
 * or removed when the cast breaks or destroys it, or undefined when the inventory stays as it is.
 */
function wanded(edit: InventoryEdit, command: WandCommand): Character | undefined {
  const { character, play, registry, slots, counted, now } = edit;
  const { inventory } = character.document;
  const sources = wandSources({
    inventory: inventory.items,
    items: itemContent(registry),
    spells: slots.spells,
    entries: characterSpellcasting(characterGrants(character.document, slots)),
    uses: play.resources.uses,
    counted,
  });
  const source = sources.find(({ item }) => item.id === command.item);
  const problem = wandProblem(command, source);
  if (problem !== undefined || source === undefined) {
    throw new ValidationError([{ path: ['command'], message: message(WAND_MESSAGES[problem ?? WandProblem.NotHeld]) }]);
  }
  const outcome = wandOutcome(command, source);
  return outcome === WandOutcome.Cast
    ? undefined
    : character.withInventory(wandInventoryAfter(inventory, command.item, outcome), now);
}

/** A block with a shield, checked against the shields the character holds, and the inventory it leaves. */
function shielded(edit: InventoryEdit, command: PlayEdit): Character | undefined {
  const { character, play, registry, now } = edit;
  const shields = shieldsOf(character, registry);
  checkShield(play, command, shields);
  const after = shieldInventoryAfter(character.document.inventory, play, { command, shields });
  return after === undefined ? undefined : character.withInventory(after, now);
}

/** Whether `command` can change the inventory: a wand cast or overcharge, which can break or destroy the wand, or a block. */
export function changesInventory(command: PlayEdit): boolean {
  return isWandCommand(command) || isShieldCommand(command);
}

/**
 * The character with its inventory changed by `command`: a wand marked broken or removed, or a shield broken or
 * destroyed by a block. Undefined when the inventory stays as it is.
 */
export function inventoryAfter(edit: InventoryEdit, command: PlayEdit): Character | undefined {
  return isWandCommand(command) ? wanded(edit, command) : shielded(edit, command);
}
