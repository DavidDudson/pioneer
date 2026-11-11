import { ContentKind, Proficiency, Selector } from '@pioneer/rules/sdk';

import type { Character } from './character';
import { characterGrants, characterRanks } from './class-build';
import type { ItemEntry } from './inventory-content';
import type { SlotContent } from './slot-offer';

/**
 * The weapon and armor categories `character` is trained in, from the class and anything else it holds. Empty when it
 * trains none, such as a character with no class, which then buys any gear.
 */
export function trainedCategories(character: Character, slots: SlotContent): ReadonlySet<Selector> {
  const ranks = characterRanks(characterGrants(character.document, slots));
  return new Set(
    [...ranks].flatMap(([selector, rank]) =>
      rank !== Proficiency.Untrained && (selector.startsWith('attack:') || selector.startsWith('defense:'))
        ? [selector]
        : [],
    ),
  );
}

/** Whether `entry` is a weapon or armor of a category the character is not trained in; any other item is never unfit. */
export function untrained(entry: ItemEntry, trained: ReadonlySet<Selector>): boolean {
  if (trained.size === 0) {
    return false;
  }
  if (entry.kind === ContentKind.Weapon) {
    return !trained.has(Selector.parse(`attack:${entry.data.category}`));
  }
  if (entry.kind === ContentKind.Armor) {
    return !trained.has(Selector.parse(`defense:${entry.data.category}`));
  }
  return false;
}
