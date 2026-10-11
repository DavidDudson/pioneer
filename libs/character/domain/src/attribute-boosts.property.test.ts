import { describe, expect, test } from 'bun:test';

import { AncestryId, Attribute, ContentId } from '@pioneer/rules/sdk';
import { assert, constantFrom, integer, option, property, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { attributeModifiers, boostSets, boostSlots, flawSlots } from './attribute-boosts';
import type { BoostSet } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { CharacterLevel } from './character-fields';
import { ANCESTRY_SLOT, BACKGROUND_SLOT, CLASS_SLOT } from './character-slots';
import { BOOST_FIXTURES, boostFixtureId, CharacterBuilder } from './testing';

const ATTRIBUTES = Object.values(Attribute);
const ancestries = constantFrom('ancestry:dwarf', 'ancestry:human');
const classes = constantFrom('class:fighter', 'class:wizard');
const levels = integer({ min: 1, max: 20 });
/** One pick per possible slot: the boost slots never number more than 4 at 1st level per source, 4 free per level. */
const SLOTS_MAX = 40;

/** `length` picks, each an attribute or nothing. */
function attributePicks(length: number): Arbitrary<(Attribute | undefined)[]> {
  return tuple(...Array.from({ length }, () => option(constantFrom(...ATTRIBUTES), { nil: undefined })));
}

const picks = attributePicks(SLOTS_MAX);
/** One pick per voluntary flaw slot, of which there are never more than attributes. */
const flawPicks = attributePicks(ATTRIBUTES.length);

/** What a generated character is made of. */
interface Generated {
  readonly ancestry: string;
  readonly characterClass: string;
  readonly level: number;
  readonly chosen: readonly (Attribute | undefined)[];
  readonly flaws: readonly (Attribute | undefined)[];
}

/**
 * A character with this ancestry and class, the farmhand background, the n-th pick in its n-th boost slot and the n-th
 * flaw in its n-th flaw slot.
 */
function characterOf({ ancestry, characterClass, level, chosen, flaws }: Generated): CharacterDocument {
  const base = new CharacterBuilder()
    .withAncestry(AncestryId.parse(boostFixtureId(ancestry)))
    .atLevel(level)
    .picking(BACKGROUND_SLOT, boostFixtureId('background:farmhand'))
    .picking(CLASS_SLOT, boostFixtureId(characterClass));
  const { document } = base.build();
  const slots = [
    ...boostSlots(document, BOOST_FIXTURES).map((slot, index) => [slot.key, chosen[index]] as const),
    ...flawSlots(document, BOOST_FIXTURES).map((slot, index) => [slot.key, flaws[index]] as const),
  ];
  for (const [key, pick] of slots) {
    if (pick !== undefined) {
      base.picking(key, pick);
    }
  }
  return base.build().document;
}

const characters: Arbitrary<CharacterDocument> = tuple(ancestries, classes, levels, picks, flawPicks).map(
  ([ancestry, characterClass, level, chosen, flaws]) => characterOf({ ancestry, characterClass, level, chosen, flaws }),
);

function raises(set: BoostSet, attribute: Attribute): boolean {
  return set.fixed.includes(attribute) || set.slots.some((slot) => slot.pick === attribute);
}

/** Whether the ancestry or any voluntary flaw lowers `attribute`; however many do, it is lowered once. */
function flawed(document: CharacterDocument, attribute: Attribute): boolean {
  const ancestry = ContentId.parse(document.build.choices[ANCESTRY_SLOT]);
  const voluntary = Object.entries(document.build.choices).some(
    ([key, value]) => key.startsWith('flaw:') && value === attribute,
  );
  return voluntary || BOOST_FIXTURES.ancestry(ancestry)?.flaws.includes(attribute) === true;
}

/**
 * The rule in closed form: 1st level gives +1 per set that raises the attribute, less one if it is flawed, which never
 * passes +4. Each later boost adds one until +4; past it, every two add one.
 */
function expected(document: CharacterDocument, attribute: Attribute): number {
  const sets = boostSets(document, BOOST_FIXTURES).filter((set) => set.level <= document.level);
  const flaw = flawed(document, attribute) ? 1 : 0;
  const first = sets.filter((set) => set.level === 1 && raises(set, attribute)).length - flaw;
  const later = sets.filter((set) => set.level > 1 && raises(set, attribute)).length;
  const full = Math.max(0, Math.min(later, 4 - first));
  return first + full + Math.floor((later - full) / 2);
}

describe('attributeModifiers (properties)', () => {
  test('every modifier follows the boost rule for any picks, voluntary flaws included, at any level', () => {
    assert(
      property(characters, (document) => {
        const modifiers = attributeModifiers(document, BOOST_FIXTURES);
        for (const attribute of ATTRIBUTES) {
          expect<number>(modifiers.get(attribute)).toBe(expected(document, attribute));
        }
      }),
    );
  });

  test('levelling up never lowers a modifier', () => {
    assert(
      property(characters, levels, (document, other) => {
        const [low, high] = [Math.min(document.level, other), Math.max(document.level, other)];
        const at = (level: number): CharacterDocument => ({ ...document, level: CharacterLevel.parse(level) });
        const before = attributeModifiers(at(low), BOOST_FIXTURES);
        const after = attributeModifiers(at(high), BOOST_FIXTURES);
        for (const attribute of ATTRIBUTES) {
          expect(after.get(attribute)).toBeGreaterThanOrEqual(before.get(attribute));
        }
      }),
    );
  });
});
