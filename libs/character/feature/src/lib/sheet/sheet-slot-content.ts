import { equippedRulesWithVariants, slotContent } from '@pioneer/character/domain';
import type { Character, ItemContent, SlotContent } from '@pioneer/character/domain';
import { NO_MODIFIERS } from '@pioneer/rules/engine';
import type { ModifierInputs } from '@pioneer/rules/engine';
import { contentKey, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';

import { variantsInForce } from '../data/registry-variants';

/** Slot content by registry: a loaded registry never changes, so its reads (and their resolved grants) are shared. */
const CONTENT = new WeakMap<ContentRegistry, SlotContent>();

/**
 * The slot content of a loaded registry, built once, so the sheet's skill reads share resolved grants. It holds the
 * second class's slot while the Dual Class variant is in force for the registry's character.
 */
export function sheetSlotContent(registry: ContentRegistry): SlotContent {
  const content = CONTENT.get(registry) ?? slotContent(registry, variantsInForce(registry));
  CONTENT.set(registry, content);

  return content;
}

/** The core rules pack's Automatic Bonus Progression, which replaces the bonuses of magic items with level ones. */
const AUTOMATIC_BONUS_PROGRESSION = contentKey(
  PackId.parse('core-rules'),
  EntrySlug.parse('variant-rule:automatic-bonus-progression'),
);

/** Whether Automatic Bonus Progression is in force for the registry's character. */
export function sheetHasAutomaticBonusProgression(registry: ContentRegistry): boolean {
  return variantsInForce(registry).some(({ key }) => key === AUTOMATIC_BONUS_PROGRESSION);
}

/** The rules in play for the character `selected` reads: its gear's, with those of the variant rules in force ahead. */
export function sheetEquippedRules(
  registry: ContentRegistry,
  items: ItemContent,
  selected: () => Character | undefined,
): () => ModifierInputs {
  return (): ModifierInputs => {
    const character = selected();

    return character === undefined
      ? NO_MODIFIERS
      : equippedRulesWithVariants(character.document, items, {
          slots: sheetSlotContent(registry),
          variants: variantsInForce(registry),
        });
  };
}
