import { describe, expect, test } from 'bun:test';

import {
  ANCESTRY_SLOT,
  Character,
  CharacterId,
  CharacterLevel,
  CharacterName,
  CharacterPatchField,
  characterSlots,
  CLASS_SLOT,
  featSlots,
  generateCharacter,
  Seed,
  slotCandidates,
  slotContent,
  SlotStatus,
} from '@pioneer/character/domain';
import type { Generated } from '@pioneer/character/domain';
import { contentCatalog } from '@pioneer/rules/catalog';
import { AncestryId, ChoiceValue, ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { derivedId, FixtureNamespace, fixedClock, UserId } from '@pioneer/shared/kernel';
import { assert, constantFrom, integer, property } from 'fast-check';

import { unfillableSlots } from './level-20-derive';

/** Time to generate a character at every level. */
const CLASS_TIMEOUT_MS = 180_000;
const SEED_MAX = 2_147_483_647;
const PROPERTY_RUNS = 12;
/**
 * Slots a generated character leaves open on top of the ones no build can fill: the generator can pick a feat whose
 * choice it cannot fill yet (a Rogue's Terrain Stalker and Specialty Crafting), which the level 20 build avoids.
 */
const GENERATED_UNFILLABLE: Readonly<Record<string, number>> = { Rogue: 2 };

/** The classes of Player Core (remaster). */
const PLAYER_CORE_CLASSES = [
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
const LEVELS = Array.from({ length: 20 }, (_unused, index) => CharacterLevel.parse(index + 1));
/** The levels each class is generated at: the first, then every fifth, where classes gain most. */
const CLASS_LEVELS = [1, 5, 10, 15, 20].map((level) => CharacterLevel.parse(level));

const registry = new ContentRegistry();
await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
const content = slotContent(registry);
const now = fixedClock('2026-01-01T00:00:00Z').now();
const classes = content.lookup.ofKind(ContentKind.Class);
const [anyAncestry] = content.lookup.ofKind(ContentKind.Ancestry);

/** A character with nothing picked, or only `className` if given: the ancestry its creation asks for is taken out. */
function blank(className?: string): Character {
  const created = Character.create({
    id: CharacterId.parse(derivedId(FixtureNamespace, 'character:generated')),
    ownerId: UserId.parse(derivedId(FixtureNamespace, 'user:generated')),
    name: CharacterName.parse('Generated'),
    ancestry: AncestryId.parse(anyAncestry?.id),
    now,
  });
  const cleared = created.apply({ field: CharacterPatchField.ClearSlot, slot: ANCESTRY_SLOT }, now);
  const chosen = classes.find((entry) => entry.name === className);
  return chosen === undefined
    ? cleared
    : cleared.apply(
        { field: CharacterPatchField.SelectSlot, slot: CLASS_SLOT, selection: ChoiceValue.parse(chosen.id) },
        now,
      );
}

function generated(start: Character, seed: number, level: CharacterLevel): Generated {
  return generateCharacter({ start, seed: Seed.parse(seed), level, content, now });
}

/**
 * The slots left open that something could fill. A feat slot whose every feat with known-met prerequisites is taken
 * elsewhere stays open by design: a feat whose prerequisites the builder can't read is never picked.
 */
function fillable(result: Generated): readonly string[] {
  const { document } = result.character;
  const slots = characterSlots(document, content);
  const feats = featSlots(document, content);
  return result.unfilled.filter((key) => {
    const slot = slots.find((each) => each.key === key);
    return (
      slot === undefined ||
      !feats.some((feat) => feat.key === key) ||
      slotCandidates(document, content, slot).length > 0
    );
  });
}

/** What is wrong with a generated character: slots read invalid, and more open than no build can fill yet. */
function problems(result: Generated, className: string | undefined): readonly string[] {
  const slots = characterSlots(result.character.document, content);
  const invalid = slots.filter((slot) => slot.status === SlotStatus.Invalid).map((slot) => `invalid ${slot.key}`);
  const allowed = className === undefined ? 0 : unfillableSlots(className) + (GENERATED_UNFILLABLE[className] ?? 0);
  const unfilled = fillable(result);
  const open = unfilled.length > allowed ? unfilled.map((key) => `open ${key}`) : [];
  return [...invalid, ...open];
}

describe('generateCharacter over Player Core', () => {
  test('the same seed gives the same character', () => {
    const level = CharacterLevel.parse(5);
    expect(generated(blank(), 11, level).character.document).toEqual(generated(blank(), 11, level).character.document);
  });

  test.each([...PLAYER_CORE_CLASSES])(
    '%s, at levels 1, 5, 10, 15 and 20 has no open or invalid slot',
    (className) => {
      for (const level of CLASS_LEVELS) {
        const result = generated(blank(className), level, level);
        expect({ level, problems: problems(result, className) }).toEqual({ level, problems: [] });
      }
    },
    CLASS_TIMEOUT_MS,
  );

  test(
    'any seed, class and level 1 to 20 has no open or invalid slot',
    () => {
      assert(
        property(
          integer({ min: 0, max: SEED_MAX }),
          constantFrom(...PLAYER_CORE_CLASSES),
          constantFrom(...LEVELS),
          (seed, className, level) => problems(generated(blank(className), seed, level), className).length === 0,
        ),
        { numRuns: PROPERTY_RUNS },
      );
    },
    CLASS_TIMEOUT_MS,
  );
});
