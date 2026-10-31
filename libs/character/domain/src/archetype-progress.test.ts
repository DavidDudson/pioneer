import { describe, expect, test } from 'bun:test';

import { ContentRegistry } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { assert, integer, property } from 'fast-check';

import { archetypeProgress } from './archetype-progress';
import type { Character } from './character';
import { slotContent } from './slot-offer';
import {
  CharacterBuilder,
  DEDICATION_CLASS,
  DEDICATION_FIXTURES,
  dedicationArchetypeId,
  dedicationFixtureId,
  dedicationSlot,
  GRANTING_CLASS,
  skillFixtures,
} from './testing';
import type { DedicationFixture } from './testing';

const registry = new ContentRegistry();
registry.register(skillFixtures());
registry.register(DEDICATION_FIXTURES);
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

/** A character at `level` with each feat picked in the archetype slot of its position, the first at 1st level. */
function taking(level: number, ...feats: readonly DedicationFixture[]): Character {
  let builder = new CharacterBuilder().picking('class', DEDICATION_CLASS).atLevel(level);
  for (const [index, feat] of feats.entries()) {
    builder = builder.picking(dedicationSlot(index + 1), dedicationFixtureId(feat));
  }
  return builder.build();
}

const MEDIC = dedicationArchetypeId('medic');

describe('archetype progress against the dedication lock', () => {
  test('a character with no dedication has no progress', () => {
    expect(archetypeProgress(taking(6, 'power-attack').document, content)).toEqual([]);
  });

  test('a dedication alone has taken none of its lock and clears nowhere', () => {
    expect(archetypeProgress(taking(6, 'medic-dedication').document, content)).toMatchObject([
      { archetype: MEDIC, taken: 0, lock: 2, clearsAt: undefined },
    ]);
  });

  test('counts the archetype’s other feats taken, and clears at the level of the feat that lifts the lock', () => {
    expect(archetypeProgress(taking(6, 'medic-dedication', 'medic-basic').document, content)).toMatchObject([
      { taken: 1, clearsAt: undefined },
    ]);
    expect(
      archetypeProgress(taking(6, 'medic-dedication', 'medic-basic', 'medic-advanced').document, content),
    ).toMatchObject([{ taken: 2, lock: 2, clearsAt: 3 }]);
  });

  test('counts only what the character has at its level, and shows the level a plan clears at', () => {
    const planned = taking(1, 'medic-dedication', 'medic-basic', 'medic-advanced');
    expect(archetypeProgress(planned.document, content)).toMatchObject([{ taken: 0, clearsAt: 3 }]);
  });

  test('an archetype’s own lock replaces Player Core’s two', () => {
    expect(archetypeProgress(taking(6, 'scout-dedication', 'scout-basic').document, content)).toMatchObject([
      { lock: 1, taken: 1, clearsAt: 2 },
    ]);
  });

  test('lists each archetype in the order its dedication is taken', () => {
    const progress = archetypeProgress(
      taking(6, 'medic-dedication', 'medic-basic', 'medic-advanced', 'sentinel-dedication').document,
      content,
    );
    expect(progress.map(({ archetype }) => archetype)).toEqual([MEDIC, dedicationArchetypeId('sentinel')]);
  });

  test('a feat a feature grants counts at the level it is granted', () => {
    const character = new CharacterBuilder().picking('class', GRANTING_CLASS).atLevel(6).build();
    expect(archetypeProgress(character.document, content)).toMatchObject([{ archetype: MEDIC, taken: 2, clearsAt: 5 }]);
  });

  test('clears only once the lock is met, however long the plan runs on', () => {
    assert(
      property(integer({ min: 1, max: 6 }), (level) => {
        const [medic] = archetypeProgress(
          taking(level, 'medic-dedication', 'medic-basic', 'medic-advanced').document,
          content,
        );
        expect(Number(medic?.clearsAt)).toBe(3);
        expect(Number(medic?.taken)).toBe(Math.min(Math.max(level - 1, 0), 2));
      }),
    );
  });
});
