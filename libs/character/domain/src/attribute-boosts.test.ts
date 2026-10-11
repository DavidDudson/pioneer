import { describe, expect, test } from 'bun:test';

import { AncestryId, Attribute, ContentId, contentId, ContentRegistry, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import { attributeModifiers, boostContent, boostSlots, BoostSource, flawSlots } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { BACKGROUND_SLOT, CLASS_SLOT } from './character-slots';
import { BOOST_FIXTURES, boostFixtureId, CharacterBuilder } from './testing';

type Modifiers = Readonly<Record<Attribute, number>>;

const ZERO: Modifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };

/** A dwarf farmhand fighter at `level`, with `picks` on top. */
function dwarfFighter(level: number, picks: Readonly<Record<string, string>> = {}): CharacterDocument {
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

function slotKeys(document: CharacterDocument): string[] {
  return boostSlots(document, BOOST_FIXTURES).map((slot) => String(slot.key));
}

function modifiers(document: CharacterDocument): Modifiers {
  return attributeModifiers(document, BOOST_FIXTURES).toWire();
}

/** The id of `<slug>` in the test pack `ContentPackBuilder` builds. */
function testPackId(slug: string): ContentId {
  return ContentId.parse(contentId(PackId.parse('test-pack'), EntrySlug.parse(slug)));
}

const FREE_AT = (level: number): string[] => [0, 1, 2, 3].map((index) => `boost:${level}:free:${index}`);

describe('boostSlots', () => {
  test('gives a slot to each boost with a choice, keyed by level, source and place, up to 20th level', () => {
    expect(slotKeys(dwarfFighter(1))).toStrictEqual([
      'boost:1:ancestry:2',
      'boost:1:background:0',
      'boost:1:background:1',
      'boost:1:class:0',
      ...FREE_AT(1),
      ...FREE_AT(5),
      ...FREE_AT(10),
      ...FREE_AT(15),
      ...FREE_AT(20),
    ]);
  });

  test('has only the free boosts until ancestry, background and class are picked', () => {
    const unpicked = new CharacterBuilder()
      .withAncestry(AncestryId.parse(boostFixtureId('ancestry:elf')))
      .build().document;
    expect(boostSlots(unpicked, BOOST_FIXTURES).every((slot) => slot.source === BoostSource.Free)).toBe(true);
  });

  test('a fixed boost is no slot, and the set’s other boosts can’t take its attribute', () => {
    const [ancestryFree] = boostSlots(dwarfFighter(1), BOOST_FIXTURES);
    expect(ancestryFree?.options).toStrictEqual([
      Attribute.Strength,
      Attribute.Dexterity,
      Attribute.Intelligence,
      Attribute.Charisma,
    ]);
    const wizard = new CharacterBuilder().picking(CLASS_SLOT, boostFixtureId('class:wizard')).build().document;
    expect(boostSlots(wizard, BOOST_FIXTURES).some((slot) => slot.source === BoostSource.Class)).toBe(false);
  });

  test('reads what each slot holds, and nothing from a pick it doesn’t offer', () => {
    const picked = dwarfFighter(1, {
      'boost:1:class:0': 'str',
      'boost:1:free:0': 'forest',
      'boost:1:ancestry:2': 'con',
    });
    const byKey = new Map(boostSlots(picked, BOOST_FIXTURES).map((slot) => [String(slot.key), slot.pick]));
    expect(byKey.get('boost:1:class:0')).toBe(Attribute.Strength);
    expect(byKey.get('boost:1:free:0')).toBeUndefined();
    expect(byKey.get('boost:1:ancestry:2')).toBeUndefined();
    expect(modifiers(picked).con).toBe(1);
  });
});

describe('attributeModifiers', () => {
  test('starts every modifier at +0 with nothing picked', () => {
    expect(modifiers(new CharacterBuilder().build().document)).toStrictEqual(ZERO);
  });

  test('applies fixed boosts and flaws, then each pick', () => {
    const dwarf = dwarfFighter(1, {
      'boost:1:ancestry:2': 'str',
      'boost:1:background:0': 'con',
      'boost:1:background:1': 'str',
      'boost:1:class:0': 'str',
      'boost:1:free:0': 'str',
      'boost:1:free:1': 'dex',
      'boost:1:free:2': 'con',
      'boost:1:free:3': 'wis',
    });
    expect(modifiers(dwarf)).toStrictEqual({ str: 4, dex: 1, con: 3, int: 0, wis: 2, cha: -1 });
  });

  test('leaves boosts above the character’s level out: they are the plan', () => {
    const planned = dwarfFighter(4, { 'boost:5:free:0': 'int' });
    expect(modifiers(planned).int).toBe(0);
    expect(modifiers({ ...planned, level: dwarfFighter(5).level }).int).toBe(1);
  });

  test('a boost at +4 or more is partial, and the second partial one raises the modifier', () => {
    const strong = {
      'boost:1:ancestry:2': 'str',
      'boost:1:background:1': 'str',
      'boost:1:class:0': 'str',
      'boost:1:free:0': 'str',
      'boost:5:free:0': 'str',
      'boost:10:free:0': 'str',
    };
    expect(modifiers(dwarfFighter(1, strong)).str).toBe(4);
    expect(modifiers(dwarfFighter(5, strong)).str).toBe(4);
    expect(modifiers(dwarfFighter(10, strong)).str).toBe(5);
  });

  test('counts an attribute once per set, however many of its slots hold it', () => {
    const twice = dwarfFighter(1, { 'boost:1:free:0': 'int', 'boost:1:free:1': 'int' });
    expect(modifiers(twice).int).toBe(1);
  });
});

describe('boostContent', () => {
  test('reads boosts and flaws from ancestries, backgrounds and classes in the registry', () => {
    const registry = new ContentRegistry();
    registry.register(
      new ContentPackBuilder()
        .withAncestry('dwarf', { boosts: [['con'], ['wis']], flaws: ['cha'] })
        .withBackground('farmhand', [['con', 'wis']])
        .withClass('fighter', ['str', 'dex'])
        .build(),
    );
    const content = boostContent(registry);
    expect(content.ancestry(testPackId('ancestry:dwarf'))).toStrictEqual({
      boosts: [['con'], ['wis']],
      flaws: ['cha'],
    });
    expect(content.background(testPackId('background:farmhand'))).toStrictEqual([['con', 'wis']]);
    expect(content.keyAttribute(testPackId('class:fighter'))).toStrictEqual(['str', 'dex']);
    expect(content.background(testPackId('class:fighter'))).toBeUndefined();
  });
});

describe('flawSlots', () => {
  test('gives a voluntary flaw slot per attribute the ancestry doesn’t flaw already, each offering those', () => {
    const slots = flawSlots(dwarfFighter(1), BOOST_FIXTURES);
    expect(slots.map((slot) => String(slot.key))).toStrictEqual([0, 1, 2, 3, 4].map((n) => `flaw:1:ancestry:${n}`));
    expect(slots[0]?.options).not.toContain(Attribute.Charisma);
    const human = new CharacterBuilder()
      .withAncestry(AncestryId.parse(boostFixtureId('ancestry:human')))
      .build().document;
    expect(flawSlots(human, BOOST_FIXTURES)).toHaveLength(Object.values(Attribute).length);
  });

  test('has none while the ancestry isn’t loaded', () => {
    expect(flawSlots(new CharacterBuilder().build().document, BOOST_FIXTURES)).toStrictEqual([]);
  });

  test('reads each pick, and nothing from one the slot doesn’t offer', () => {
    const picked = dwarfFighter(1, { 'flaw:1:ancestry:0': 'int', 'flaw:1:ancestry:1': 'cha' });
    expect(flawSlots(picked, BOOST_FIXTURES).map((slot) => slot.pick)).toStrictEqual([
      Attribute.Intelligence,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });
});

describe('attributeModifiers with voluntary flaws', () => {
  test('a voluntary flaw lowers its attribute by one, as an ancestry flaw does', () => {
    const flawed = dwarfFighter(1, { 'flaw:1:ancestry:0': 'int', 'flaw:1:ancestry:1': 'str' });
    expect(modifiers(flawed)).toStrictEqual({ ...ZERO, con: 1, wis: 1, cha: -1, int: -1, str: -1 });
  });

  test('a flaw the ancestry has already, or one taken twice, lowers nothing more', () => {
    const twice = dwarfFighter(1, {
      'flaw:1:ancestry:0': 'cha',
      'flaw:1:ancestry:1': 'int',
      'flaw:1:ancestry:2': 'int',
    });
    expect(modifiers(twice)).toMatchObject({ cha: -1, int: -1 });
  });

  test('boosts raise a flawed attribute from -1', () => {
    expect(modifiers(dwarfFighter(1, { 'flaw:1:ancestry:0': 'str', 'boost:1:class:0': 'str' })).str).toBe(0);
  });
});
