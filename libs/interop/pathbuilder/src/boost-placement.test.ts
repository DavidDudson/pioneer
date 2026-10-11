import { describe, expect, test } from 'bun:test';

import { attributeModifiers, BACKGROUND_SLOT, BoostSource, CLASS_SLOT } from '@pioneer/character/domain';
import type { BoostContent, CharacterDocument } from '@pioneer/character/domain';
import { BOOST_FIXTURES, boostFixtureId, CharacterBuilder } from '@pioneer/character/domain/testing';
import { AncestryId, Attribute, AttributeModifiers, AttributeModifiersWire, Level } from '@pioneer/rules/sdk';

import { modifierDifferences, placeBoosts, placeFlaws } from './boost-placement';
import type { ImportedBoosts } from './read-boosts';

const { Strength: STR, Dexterity: DEX, Constitution: CON, Intelligence: INT, Wisdom: WIS, Charisma: CHA } = Attribute;

/** A dwarf (Con and Wis fixed, one free boost) farmhand fighter at `level`, background and class left out on request. */
function dwarf(level: number, roots: { readonly background?: boolean } = {}): CharacterDocument {
  const builder = new CharacterBuilder()
    .withAncestry(AncestryId.parse(boostFixtureId('ancestry:dwarf')))
    .atLevel(level)
    .picking(CLASS_SLOT, boostFixtureId('class:fighter'));
  if (roots.background !== false) {
    builder.picking(BACKGROUND_SLOT, boostFixtureId('background:farmhand'));
  }
  return builder.build().document;
}

function boosts(source: BoostSource, level: number, attributes: readonly Attribute[]): ImportedBoosts {
  return { source, level: Level.parse(level), attributes };
}

const FIRST_LEVEL: readonly ImportedBoosts[] = [
  boosts(BoostSource.Ancestry, 1, [CON, WIS, DEX]),
  boosts(BoostSource.Background, 1, [WIS, CON]),
  boosts(BoostSource.Class, 1, [STR]),
  boosts(BoostSource.Free, 1, [STR, DEX, CON, INT]),
];

describe('placeBoosts', () => {
  test('puts each boost in its set, past the fixed ones, each slot a different attribute it offers', () => {
    const { choices, unplaced } = placeBoosts(dwarf(1), BOOST_FIXTURES, FIRST_LEVEL);
    expect<Readonly<Record<string, string>>>(choices).toStrictEqual({
      'boost:1:ancestry:2': DEX,
      'boost:1:background:0': WIS,
      'boost:1:background:1': CON,
      'boost:1:class:0': STR,
      'boost:1:free:0': STR,
      'boost:1:free:1': DEX,
      'boost:1:free:2': CON,
      'boost:1:free:3': INT,
    });
    expect(unplaced).toStrictEqual([]);
  });

  test('the placed boosts give the modifiers Pathbuilder would', () => {
    const document = dwarf(1);
    const { choices } = placeBoosts(document, BOOST_FIXTURES, FIRST_LEVEL);
    const placed = { ...document, build: { ...document.build, choices: { ...document.build.choices, ...choices } } };
    expect<Readonly<Record<string, number>>>(attributeModifiers(placed, BOOST_FIXTURES).toWire()).toStrictEqual({
      str: 2,
      dex: 2,
      con: 3,
      int: 1,
      wis: 2,
      cha: -1,
    });
  });

  test('a set the character lacks leaves all its boosts unplaced', () => {
    const { choices, unplaced } = placeBoosts(dwarf(1, { background: false }), BOOST_FIXTURES, [
      boosts(BoostSource.Background, 1, [WIS, CON]),
    ]);
    expect<Readonly<Record<string, string>>>(choices).toStrictEqual({});
    expect(unplaced).toStrictEqual([
      { source: BoostSource.Background, level: Level.parse(1), attribute: WIS },
      { source: BoostSource.Background, level: Level.parse(1), attribute: CON },
    ]);
  });

  test('a boost no slot offers, or a repeat within a set, is unplaced', () => {
    const { choices, unplaced } = placeBoosts(dwarf(5), BOOST_FIXTURES, [
      boosts(BoostSource.Class, 1, [STR, CHA]),
      boosts(BoostSource.Free, 5, [STR, STR, DEX]),
    ]);
    expect<Readonly<Record<string, string>>>(choices).toStrictEqual({
      'boost:1:class:0': STR,
      'boost:5:free:0': STR,
      'boost:5:free:1': DEX,
    });
    expect(unplaced).toStrictEqual([
      { source: BoostSource.Class, level: Level.parse(1), attribute: CHA },
      { source: BoostSource.Free, level: Level.parse(5), attribute: STR },
    ]);
  });

  test('moves an earlier boost along when a later one fits only the slot it took', () => {
    const narrow: BoostContent = {
      ancestry: () => undefined,
      background: () => [
        [CON, WIS],
        [STR, CON],
      ],
      keyAttribute: () => undefined,
    };
    const { choices, unplaced } = placeBoosts(dwarf(1), narrow, [boosts(BoostSource.Background, 1, [CON, WIS])]);
    expect<Readonly<Record<string, string>>>(choices).toStrictEqual({
      'boost:1:background:0': WIS,
      'boost:1:background:1': CON,
    });
    expect(unplaced).toStrictEqual([]);
  });

  test('a fixed boost Pathbuilder repeats takes nothing from the slots', () => {
    const { choices, unplaced } = placeBoosts(dwarf(1), BOOST_FIXTURES, [
      boosts(BoostSource.Ancestry, 1, [WIS, CON, WIS]),
    ]);
    expect<Readonly<Record<string, string>>>(choices).toStrictEqual({});
    expect(unplaced).toStrictEqual([{ source: BoostSource.Ancestry, level: Level.parse(1), attribute: WIS }]);
  });
});

describe('placeFlaws', () => {
  test('puts each voluntary flaw in a flaw slot, in export order, past the ancestry’s own', () => {
    expect<Readonly<Record<string, string>>>(placeFlaws(dwarf(1), BOOST_FIXTURES, [CHA, INT, STR])).toStrictEqual({
      'flaw:1:ancestry:0': INT,
      'flaw:1:ancestry:1': STR,
    });
  });

  test('takes an attribute once, however many times Pathbuilder lists it', () => {
    expect<Readonly<Record<string, string>>>(placeFlaws(dwarf(1), BOOST_FIXTURES, [INT, INT])).toStrictEqual({
      'flaw:1:ancestry:0': INT,
    });
  });

  test('places nothing when the export has no flaws beyond the ancestry’s', () => {
    expect(placeFlaws(dwarf(1), BOOST_FIXTURES, [CHA])).toStrictEqual({});
    expect(placeFlaws(dwarf(1), BOOST_FIXTURES, [])).toStrictEqual({});
  });

  test('the placed flaws lower their attributes', () => {
    const document = dwarf(1);
    const choices = placeFlaws(document, BOOST_FIXTURES, [CHA, DEX]);
    const flawed = { ...document, build: { ...document.build, choices: { ...document.build.choices, ...choices } } };
    expect<number>(attributeModifiers(flawed, BOOST_FIXTURES).get(DEX)).toBe(-1);
  });
});

describe('modifierDifferences', () => {
  test('lists each attribute whose modifiers differ, in attribute order', () => {
    const imported = new AttributeModifiers(
      AttributeModifiersWire.parse({ str: 4, dex: 0, con: 1, int: 0, wis: 2, cha: 0 }),
    );
    const derived = new AttributeModifiers(
      AttributeModifiersWire.parse({ str: 4, dex: 1, con: 1, int: 0, wis: 1, cha: 0 }),
    );
    expect<readonly object[]>(modifierDifferences(imported, derived)).toStrictEqual([
      { attribute: DEX, imported: 0, derived: 1 },
      { attribute: WIS, imported: 2, derived: 1 },
    ]);
    expect(modifierDifferences(imported, imported)).toStrictEqual([]);
  });
});
