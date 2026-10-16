import {
  characterGrants,
  characterSpellcasting,
  itemContent,
  wandInventoryAfter,
  wandOutcome,
  WandOutcome,
  WandProblem,
  wandProblem,
  wandSources,
} from '@pioneer/character/domain';
import type { Character, CountedMaxima, PlayState, SlotContent, WandCommand } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { message, ValidationError } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';

const WAND_MESSAGES = {
  [WandProblem.NotHeld]: 'character.validation.wandNotHeld',
  [WandProblem.Broken]: 'character.validation.wandBroken',
  [WandProblem.NotCastable]: 'character.validation.wandNotCastable',
  [WandProblem.UseSpent]: 'character.validation.wandUseSpent',
  [WandProblem.UseLeft]: 'character.validation.wandUseLeft',
  [WandProblem.RollMissing]: 'character.validation.wandRollMissing',
} as const satisfies Record<WandProblem, string>;

/** What a wand cast is checked against: the character and its play, and the content, slots and uses they are read over. */
export interface WandCastContext {
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
export function checkWandCast(command: WandCommand, context: WandCastContext): Character | undefined {
  const { character, play, registry, slots, counted, now } = context;
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
