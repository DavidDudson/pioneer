import { describe, expect, test } from 'bun:test';

import { ContentRegistry } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { fixedClock } from '@pioneer/shared/kernel';

import { CharacterLevel } from './character-fields';
import { SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { CLASS_SLOT } from './character-slots';
import { generateCharacter } from './generate-character';
import type { Generated } from './generate-character';
import { Seed } from './pick-source';
import { slotCandidates } from './slot-candidates';
import { slotRefusal, slotContent } from './slot-offer';
import { CharacterBuilder, playerCoreClasses } from './testing';

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };
const now = fixedClock('2026-01-01T00:00:00Z').now();
const LEVELS = [1, 5, 20];
const SEEDS = [1, 2, 3, 4, 5, 6];
const SLOW = 90_000;

function generated(seed: number, level: number): Generated {
  return generateCharacter({
    start: new CharacterBuilder().build(),
    seed: Seed.parse(seed),
    level: CharacterLevel.parse(level),
    content,
    now,
  });
}

function isClassOrBoost(key: SlotKey): boolean {
  return key === CLASS_SLOT || key.startsWith('boost:');
}

describe('generateCharacter', () => {
  test(
    'the same seed gives the same character, another seed another',
    () => {
      expect(generated(7, 5).character.document).toEqual(generated(7, 5).character.document);
      const classes = SEEDS.map((seed) => generated(seed, 1).character.document.build.choices[CLASS_SLOT]);
      expect(new Set(classes).size).toBeGreaterThan(1);
    },
    SLOW,
  );

  test.each(LEVELS)(
    'at level %d no slot is invalid and none left open offers a pick the builder accepts',
    (level) => {
      for (const seed of SEEDS) {
        const { character } = generated(seed, level);
        const { document } = character;
        const slots = characterSlots(document, content);
        expect(slots.filter((slot) => slot.status === SlotStatus.Invalid)).toEqual([]);
        const acceptable = slots
          .filter((slot) => slot.status === SlotStatus.Open)
          .filter((slot) =>
            slotCandidates(document, content, slot).some(
              (selection) => slotRefusal(document, content, { slot: slot.key, selection }) === undefined,
            ),
          );
        expect(acceptable.map((slot) => slot.key)).toEqual([]);
      }
    },
    SLOW,
  );

  test('fills the class and every boost from what the content offers', () => {
    const { character, unfilled } = generated(3, 1);
    expect(character.document.build.choices[CLASS_SLOT]).toBeDefined();
    expect(unfilled.filter((key) => isClassOrBoost(key))).toEqual([]);
  });
});
