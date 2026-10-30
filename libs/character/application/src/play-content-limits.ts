import {
  abilityFrequencies,
  characterCounted,
  characterFocus,
  characterGrants,
  characterSpellcasting,
  itemActivations,
  itemContent,
  itemWands,
  resourceMaxima,
  slotContent,
  staffLimits,
} from '@pioneer/character/domain';
import type { Character, CountedMaxima, ResourceMaxima, SlotContent, StaffLimits } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';

import { contentOfCharacter, variantRulesOfCharacter } from './character-content';
import type { CharacterContentSource } from './character-content';

/** The slots `character` has over `registry`, with the variant rules in force for it (Dual Class adds a class). */
export async function slotsOf(
  source: CharacterContentSource,
  character: Character,
  registry: ContentRegistry,
): Promise<SlotContent> {
  return slotContent(registry, await variantRulesOfCharacter(source, character, registry));
}

/** Hero points are at most 3; the focus pool comes from the character's focus spells and feats. */
export async function resourceMaximaOf(source: CharacterContentSource, character: Character): Promise<ResourceMaxima> {
  const registry = await contentOfCharacter(source, character).registry();
  const slots = await slotsOf(source, character, registry);
  const entries = characterSpellcasting(characterGrants(character.document, slots));
  return resourceMaxima(characterFocus(entries, slots.spells, character.document.level).pool);
}

/** Spell slots by entry and rank, and ability uses, as the build and the content give them. */
export async function countedOf(source: CharacterContentSource, character: Character): Promise<CountedMaxima> {
  const registry = await contentOfCharacter(source, character).registry();
  const grants = characterGrants(character.document, await slotsOf(source, character, registry));
  return characterCounted(grants, abilityFrequencies(registry), {
    items: character.document.inventory.items,
    activations: itemActivations(registry),
    wands: itemWands(registry),
  });
}

/** The staves, highest spell rank and expendable slots daily preparations reads to prepare a staff. */
export async function staffOf(source: CharacterContentSource, character: Character): Promise<StaffLimits> {
  const registry = await contentOfCharacter(source, character).registry();
  const grants = characterGrants(character.document, await slotsOf(source, character, registry));
  return staffLimits(grants, character.document.inventory.items, itemContent(registry));
}
