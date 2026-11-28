import { describe, expect, test } from 'bun:test';

import { CharacterLevel, characterSlots, featSlots, slotCandidates, SlotStatus } from '@pioneer/character/domain';
import type { Character, Generated } from '@pioneer/character/domain';
import { assert, constantFrom, integer, property } from 'fast-check';

import {
  blankIn,
  CLASS_TIMEOUT_MS,
  contentOf,
  generatorIn,
  PLAYER_CORE_CLASSES,
  SEED_MAX,
} from './generate-character-testing';
import { sweep } from './generation-sweep';
import { unfillableSlots } from './level-20-derive';

const PROPERTY_RUNS = 12;

/**
 * Slots a generated character leaves open on top of the ones no build can fill: the generator can pick a feat whose
 * choice it cannot fill yet (a Rogue's Terrain Stalker and Specialty Crafting, or the Signature Weapon of an Alchemist
 * and a Fighter, which wants a weapon the build does not own), which the level 20 build avoids.
 */
const GENERATED_UNFILLABLE: ReadonlyMap<string, number> = new Map([
  ['Alchemist', 1],
  ['Fighter', 1],
  ['Rogue', 2],
]);

const content = await contentOf();

/** A character with nothing picked, or only `className` if given. */
function blank(className?: string): Character {
  return blankIn(content, className);
}

const generated = generatorIn(content);

/**
 * The slots left open that something could fill. A feat slot whose every feat with known-met prerequisites is taken
 * elsewhere stays open by design: a feat whose prerequisites the builder can't read is never picked.
 */
function fillable(result: Generated): ReadonlyArray<string> {
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
function problems(result: Generated, className: string | undefined): ReadonlyArray<string> {
  const slots = characterSlots(result.character.document, content);
  const invalid = slots.filter((slot) => slot.status === SlotStatus.Invalid).map((slot) => `invalid ${slot.key}`);
  const allowed = className === undefined ? 0 : unfillableSlots(className) + (GENERATED_UNFILLABLE.get(className) ?? 0);
  const unfilled = fillable(result);
  const open = unfilled.length > allowed ? unfilled.map((key) => `open ${key}`) : [];

  return [...invalid, ...open];
}

describe('generateCharacter over Player Core', () => {
  test(
    'the same seed gives the same character',
    () => {
      const level = CharacterLevel.parse(5);
      expect(generated(blank(), 11, level).character.document).toEqual(
        generated(blank(), 11, level).character.document,
      );
    },
    CLASS_TIMEOUT_MS,
  );

  test.each([...PLAYER_CORE_CLASSES])(
    '%s has no open or invalid slot at each spot level',
    (className) => {
      for (const level of sweep.spotLevels) {
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
          constantFrom(...sweep.propertyLevels),
          (seed, className, level) => problems(generated(blank(className), seed, level), className).length === 0,
        ),
        sweep.parameters(PROPERTY_RUNS),
      );
    },
    CLASS_TIMEOUT_MS,
  );
});
