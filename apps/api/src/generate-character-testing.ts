import {
  ANCESTRY_SLOT,
  Character,
  CharacterId,
  CharacterLevel,
  CharacterName,
  CharacterPatchField,
  CLASS_SLOT,
  generateCharacter,
  Seed,
  slotContent,
} from '@pioneer/character/domain';
import type { Generated, SlotContent } from '@pioneer/character/domain';
import { contentCatalog } from '@pioneer/rules/catalog';
import { AncestryId, ChoiceValue, ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { derivedId, FixtureNamespace, fixedClock, UserId } from '@pioneer/shared/kernel';

/** Time to generate a character at every level. */
export const CLASS_TIMEOUT_MS = 180_000;
export const SEED_MAX = 2_147_483_647;

/** The classes of Player Core (remaster). */
export const PLAYER_CORE_CLASSES = [
  'Alchemist',
  'Barbarian',
  'Bard',
  'Champion',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Wizard',
] as const;
export const LEVELS = Array.from({ length: 20 }, (_unused, index) => CharacterLevel.parse(index + 1));

const now = fixedClock('2026-01-01T00:00:00Z').now();

/** The content of the catalog's packs, or only of those named by `packs`. */
export async function contentOf(packs?: readonly string[]): Promise<SlotContent> {
  const registry = new ContentRegistry();
  const wanted = contentCatalog.filter((loader) => packs === undefined || packs.includes(loader.id));
  await Promise.all(wanted.map(async (loader) => registry.load(loader)));
  return slotContent(registry);
}

/** A character with nothing picked, or only `className` if given: the ancestry its creation asks for is taken out. */
export function blankIn(content: SlotContent, className?: string): Character {
  const [anyAncestry] = content.lookup.ofKind(ContentKind.Ancestry);
  const created = Character.create({
    id: CharacterId.parse(derivedId(FixtureNamespace, 'character:generated')),
    ownerId: UserId.parse(derivedId(FixtureNamespace, 'user:generated')),
    name: CharacterName.parse('Generated'),
    ancestry: AncestryId.parse(anyAncestry?.id),
    now,
  });
  const cleared = created.apply({ field: CharacterPatchField.ClearSlot, slot: ANCESTRY_SLOT }, now);
  const chosen = content.lookup.ofKind(ContentKind.Class).find((entry) => entry.name === className);
  return chosen === undefined
    ? cleared
    : cleared.apply(
        { field: CharacterPatchField.SelectSlot, slot: CLASS_SLOT, selection: ChoiceValue.parse(chosen.id) },
        now,
      );
}

/** A generator over `content`: the character it makes from `start`, for `seed`, at `level`. */
export function generatorIn(
  content: SlotContent,
): (start: Character, seed: number, level: CharacterLevel) => Generated {
  return (start, seed, level) => generateCharacter({ start, seed: Seed.parse(seed), level, content, now });
}
