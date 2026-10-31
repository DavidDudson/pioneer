import { describe, expect, test } from 'bun:test';

import {
  CharacterLevel,
  characterSlots,
  generateCharacter,
  Seed,
  SlotStatus,
  SlotSubjectKind,
} from '@pioneer/character/domain';
import type { Character, Generated, GenerateLock } from '@pioneer/character/domain';
import { fixedClock } from '@pioneer/shared/kernel';

import { blankIn, contentOf } from './generate-character-testing';

const LEVEL = CharacterLevel.parse(5);
const FIRST = Seed.parse(3);
const SECOND = Seed.parse(4);
const TIMEOUT_MS = 180_000;
const now = fixedClock('2026-01-01T00:00:00Z').now();
const content = await contentOf();

/** The character `start` becomes at `seed`, keeping `locks`. */
function rolled(start: Character, seed: Seed, locks: readonly GenerateLock[]): Generated {
  return generateCharacter({ start, seed, level: LEVEL, content, now, locks });
}

/** Every filled slot of `character` as a lock. */
function picksOf(character: Character): readonly GenerateLock[] {
  return characterSlots(character.document, content).flatMap((slot) =>
    slot.status === SlotStatus.Filled ? [{ slot: slot.key, selection: slot.selection }] : [],
  );
}

/** The locks that `kept` does not hold. */
function notKept(locks: readonly GenerateLock[], kept: readonly GenerateLock[]): readonly GenerateLock[] {
  return locks.filter((lock) => !kept.some((pick) => pick.slot === lock.slot && pick.selection === lock.selection));
}

/** The picks of `character` in the slots of the given kind. */
function picksOfKind(character: Character, kind: SlotSubjectKind): readonly GenerateLock[] {
  const wanted = new Set(
    characterSlots(character.document, content).flatMap((slot) =>
      slot.status === SlotStatus.Filled && slot.subject.kind === kind ? [slot.key] : [],
    ),
  );
  return picksOf(character).filter((pick) => wanted.has(pick.slot));
}

describe('generating with locks', () => {
  const original = rolled(blankIn(content, 'Fighter'), FIRST, []).character;
  const locks = picksOfKind(original, SlotSubjectKind.Root);

  test(
    'keeps the locked picks on a re-roll with a new seed, and changes the others',
    () => {
      const again = rolled(blankIn(content), SECOND, locks);
      expect(again.unmet).toEqual([]);
      const kept = picksOf(again.character);
      const missing = notKept(locks, kept);
      expect(missing).toEqual([]);
      expect(kept).not.toEqual(picksOf(original));
    },
    TIMEOUT_MS,
  );

  test(
    'gives the same character for the same seed and locks',
    () => {
      const first = rolled(blankIn(content), SECOND, locks).character.document;
      const second = rolled(blankIn(content), SECOND, locks).character.document;
      expect(second).toEqual(first);
    },
    TIMEOUT_MS,
  );

  test(
    'reports a lock whose slot only opens under a pick that is not locked',
    () => {
      const dependent = picksOfKind(original, SlotSubjectKind.Choice).slice(0, 1);
      const again = rolled(blankIn(content, 'Wizard'), SECOND, dependent);
      expect(again.unmet).toEqual(dependent.map((pick) => pick.slot));
    },
    TIMEOUT_MS,
  );
});
