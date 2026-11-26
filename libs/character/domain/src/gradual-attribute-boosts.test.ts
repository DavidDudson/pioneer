import { describe, expect, test } from 'bun:test';

import { AncestryId, ChoiceValue, ContentRegistry, SlotKey, VariantStructure } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import { attributeModifiers, boostSlots, BoostSource } from './attribute-boosts';
import type { BoostContent, BoostSlot } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { BACKGROUND_SLOT, CLASS_SLOT } from './character-slots';
import { slotContent } from './slot-offer';
import { BOOST_FIXTURES, boostFixtureId, CharacterBuilder } from './testing';

const GRADUAL: BoostContent = { ...BOOST_FIXTURES, gradual: true };

/** The levels GM Core gives a boost at: the four levels up to each fifth, from the 2nd. */
const GRADUAL_LEVELS = [2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 15, 17, 18, 19, 20];

function fighter(level: number, picks: Readonly<Record<string, string>> = {}): CharacterDocument {
  const builder = new CharacterBuilder()
    .withAncestry(AncestryId.parse(boostFixtureId('ancestry:dwarf')))
    .atLevel(level)
    .picking(BACKGROUND_SLOT, boostFixtureId('background:farmhand'))
    .picking(CLASS_SLOT, boostFixtureId('class:fighter'));

  for (const [slot, selection] of Object.entries(picks)) {
    builder.picking(slot, selection);
  }

  return builder.build().document;
}

/** The levels of the free boost slots, in order, one entry per slot. */
function freeLevels(document: CharacterDocument, content: BoostContent): number[] {
  return boostSlots(document, content)
    .filter((slot) => slot.source === BoostSource.Free)
    .map((slot) => slot.level);
}

/** A free boost slot taken after 1st level, which the schedule spreads out. */
function isLaterFreeBoost(slot: BoostSlot): boolean {
  return slot.source === BoostSource.Free && slot.level > 1;
}

describe('Gradual Attribute Boosts', () => {
  test('keeps four free boosts at 1st level, then one a level over the four levels up to each fifth', () => {
    const expected = [1, 1, 1, 1, ...GRADUAL_LEVELS];
    expect(freeLevels(fighter(1), GRADUAL)).toStrictEqual(expected);
  });

  test('gives the same twenty free boosts as the usual schedule', () => {
    expect(freeLevels(fighter(1), GRADUAL)).toHaveLength(freeLevels(fighter(1), BOOST_FIXTURES).length);
  });

  test('keys each single boost by its level', () => {
    const keys = boostSlots(fighter(1), GRADUAL)
      .filter((slot) => isLaterFreeBoost(slot))
      .map((slot) => String(slot.key));

    expect(keys).toStrictEqual(GRADUAL_LEVELS.map((level) => `boost:${level}:free:0`));
  });

  test('counts a boost at the level it is taken, not at the fifth level', () => {
    const picks = { 'boost:2:free:0': 'str' };
    const document = fighter(2, picks);
    const usual = attributeModifiers(document, BOOST_FIXTURES).toWire();
    const gradual = attributeModifiers(document, GRADUAL).toWire();

    expect(gradual.str).toBeGreaterThan(usual.str);
  });

  test('keeps a pick in a slot the schedule no longer has', () => {
    const document = fighter(20, { 'boost:5:free:2': 'dex' });

    expect(document.build.choices[SlotKey.parse('boost:5:free:2')]).toBe(ChoiceValue.parse('dex'));
    expect(boostSlots(document, GRADUAL).map((slot) => String(slot.key))).not.toContain('boost:5:free:2');
    expect(boostSlots(document, BOOST_FIXTURES).map((slot) => String(slot.key))).toContain('boost:5:free:2');
  });
});

describe('a group of gradual boosts', () => {
  test('raises an attribute once, however many of its four levels name it', () => {
    const picks = {
      'boost:2:free:0': 'str',
      'boost:3:free:0': 'str',
      'boost:4:free:0': 'str',
      'boost:5:free:0': 'str',
    };

    const once = attributeModifiers(fighter(5, { 'boost:2:free:0': 'str' }), GRADUAL).toWire();
    const four = attributeModifiers(fighter(5, picks), GRADUAL).toWire();

    expect(four.str).toBe(once.str);
  });

  test('counts the same attribute again in the next group', () => {
    const picks = { 'boost:5:free:0': 'str', 'boost:10:free:0': 'str' };

    const one = attributeModifiers(fighter(10, { 'boost:5:free:0': 'str' }), GRADUAL).toWire();
    const two = attributeModifiers(fighter(10, picks), GRADUAL).toWire();

    expect(two.str).toBeGreaterThan(one.str);
  });
});

describe('the Gradual Attribute Boosts variant rule', () => {
  const registry = new ContentRegistry();
  registry.register(
    new ContentPackBuilder()
      .withId('boosts')
      .withVariantRule('gradual', [VariantStructure.GradualBoosts])
      .withVariantRule('plain')
      .build(),
  );
  const variantBySlug = new Map(registry.variantRules().map((variant) => [variant.definition.slug, variant]));
  const gradual = [...variantBySlug.values()].filter(({ definition }) => definition.slug.endsWith('gradual'));
  const plain = [...variantBySlug.values()].filter(({ definition }) => definition.slug.endsWith('plain'));

  test('turns the schedule on while it is in force, and off with a variant that does not name it', () => {
    expect(slotContent(registry, gradual).boosts.gradual).toBe(true);
    expect(slotContent(registry, plain).boosts.gradual).toBe(false);
    expect(slotContent(registry).boosts.gradual).toBe(false);
  });
});
