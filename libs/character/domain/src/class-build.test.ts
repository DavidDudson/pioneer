import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry, Selector, SlotKey } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { characterGrants, characterRanks, classContent, classFeatures, classInputs, subclassSlot } from './class-build';
import { slotContent } from './slot-offer';
import { CharacterBuilder, PLAYER_CORE_CLASSES, playerCoreClasses, playerCoreClassId, playerCoreId } from './testing';
import type { PlayerCoreClass } from './testing';

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };
const classes = classContent(registry);

const KEY_ATTRIBUTE = 'boost:1:class:0';

function level1(name: PlayerCoreClass): CharacterBuilder {
  return new CharacterBuilder().named(name).picking('class', playerCoreClassId(name)).picking(KEY_ATTRIBUTE, 'dex');
}

interface Expected {
  readonly hitPoints: number;
  readonly keyAttribute: string;
  /** Perception, then Fortitude, Reflex and Will. */
  readonly ranks: readonly [string, string, string, string];
  readonly features: readonly string[];
  readonly subclasses: string[] | undefined;
}

const TRAINED = 'trained';
const EXPERT = 'expert';

/** Player Core's classes at 1st level, as its class pages give them. */
const PLAYER_CORE: Readonly<Record<PlayerCoreClass, Expected>> = {
  bard: {
    hitPoints: 8,
    keyAttribute: 'cha',
    ranks: [EXPERT, TRAINED, TRAINED, EXPERT],
    features: ['Bard Spellcasting', 'Composition Spells', 'Muses', 'Spell Repertoire'],
    subclasses: ['Enigma', 'Maestro', 'Polymath', 'Warrior'],
  },
  cleric: {
    hitPoints: 8,
    keyAttribute: 'wis',
    ranks: [TRAINED, TRAINED, TRAINED, EXPERT],
    features: ['Cleric Spellcasting', 'Deity (Cleric)', 'Divine Font', 'Doctrine', 'First Doctrine'],
    subclasses: ['Cloistered Cleric', 'Warpriest'],
  },
  druid: {
    hitPoints: 8,
    keyAttribute: 'wis',
    ranks: [TRAINED, TRAINED, TRAINED, EXPERT],
    features: [
      'Anathema (Druid)',
      'Druid Spellcasting',
      'Druidic Order',
      'Shield Block',
      'Voice of Nature',
      'Wildsong',
    ],
    subclasses: ['Animal Order', 'Leaf Order', 'Storm Order', 'Untamed Order'],
  },
  fighter: {
    hitPoints: 10,
    keyAttribute: 'dex',
    ranks: [EXPERT, EXPERT, EXPERT, TRAINED],
    features: ['Reactive Strike', 'Shield Block'],
    subclasses: undefined,
  },
  ranger: {
    hitPoints: 10,
    keyAttribute: 'dex',
    ranks: [EXPERT, EXPERT, EXPERT, TRAINED],
    features: ['Hunt Prey', "Hunter's Edge"],
    subclasses: ['Flurry', 'Outwit', 'Precision'],
  },
  rogue: {
    hitPoints: 8,
    keyAttribute: 'dex',
    ranks: [EXPERT, TRAINED, EXPERT, EXPERT],
    features: ["Rogue's Racket", 'Sneak Attack', 'Surprise Attack'],
    subclasses: ['Mastermind', 'Ruffian', 'Scoundrel', 'Thief'],
  },
  witch: {
    hitPoints: 6,
    keyAttribute: 'int',
    ranks: [TRAINED, TRAINED, TRAINED, EXPERT],
    features: ['Familiar (Witch)', 'Hex Spells', 'Patron', 'Witch Spellcasting'],
    subclasses: [
      "Faith's Flamekeeper",
      'Silence in Snow',
      'Spinner of Threads',
      'Starless Shadow',
      'The Inscribed One',
      'The Resentment',
      'Wilding Steward',
    ],
  },
  wizard: {
    hitPoints: 6,
    keyAttribute: 'int',
    ranks: [TRAINED, TRAINED, TRAINED, EXPERT],
    features: ['Arcane Bond', 'Arcane School', 'Arcane Thesis', 'Wizard Spellcasting'],
    subclasses: [
      'School of Ars Grammatica',
      'School of Battle Magic',
      'School of Civic Wizardry',
      'School of Mentalism',
      'School of Protean Form',
      'School of Unified Magical Theory',
      'School of the Boundary',
    ],
  },
};

const STATISTICS = ['perception', 'save:fortitude', 'save:reflex', 'save:will'].map((selector) =>
  Selector.parse(selector),
);
const CLASS_DC = Selector.parse('class-dc');
const AC = Selector.parse('ac');
const UNARMORED = Selector.parse('defense:unarmored');

describe('Player Core classes at 1st level', () => {
  test.each([...PLAYER_CORE_CLASSES])('%s', (name) => {
    const expected = PLAYER_CORE[name];
    const { document } = level1(name).build();
    const grants = characterGrants(document, content);
    const ranks = characterRanks(grants);
    const features = classFeatures(grants, content.lookup);

    const inputs = classInputs(document, content, classes);
    expect([Number(inputs?.hitPoints), String(inputs?.keyAttribute)]).toEqual([
      expected.hitPoints,
      expected.keyAttribute,
    ]);
    expect(STATISTICS.map((selector) => String(ranks.get(selector)))).toEqual([...expected.ranks]);
    expect(ranks.get(CLASS_DC)).toBe(TRAINED);
    expect(ranks.get(AC)).toBe(ranks.get(UNARMORED));
    expect(features.map((feature) => String(feature.name))).toEqual([...expected.features]);
    expect(new Set(features.map((feature) => `${feature.className} ${feature.level}`)).size).toBe(1);
    expect(subclassSlot(grants, content.lookup, classes)?.options.map((option) => String(option.label))).toEqual(
      expected.subclasses,
    );
  });

  test('every class resolves without errors, but the druid, whose Voice of Nature choice is untranslated', () => {
    const failing = PLAYER_CORE_CLASSES.filter((name) => {
      const { document } = level1(name).build();
      return characterGrants(document, content).errors.length > 0;
    });
    expect(failing).toEqual(['druid']);
  });
});

describe('the subclass', () => {
  const cleric = level1('cleric').build().document;
  const doctrine = subclassSlot(characterGrants(cleric, content), content.lookup, classes);
  const cloistered = playerCoreId(ContentKind.ClassFeature, 'cloistered-cleric');

  test('picked, it is a class feature from the class level that offered it', () => {
    const { document } = level1('cleric').picking(String(doctrine?.key), cloistered).build();
    const features = classFeatures(characterGrants(document, content), content.lookup);

    expect(features.find((feature) => feature.id === cloistered)).toMatchObject({
      name: 'Cloistered Cleric',
      className: 'Cleric',
      level: 1,
    });
  });

  test('a class change keeps the picks that depended on the old class, flagged as hidden, never dropped', () => {
    const doctrineKey = SlotKey.parse(String(doctrine?.key));
    const keyAttribute = SlotKey.parse(KEY_ATTRIBUTE);
    const wizard = playerCoreClassId('wizard');
    const exCleric = level1('cleric').picking(doctrineKey, cloistered).picking('class', wizard).build().document;
    const exFighter = level1('fighter').picking('class', wizard).build().document;
    const statusOf = (document: typeof exCleric, key: SlotKey): SlotStatus | undefined =>
      characterSlots(document, content).find((slot) => slot.key === key)?.status;

    expect(statusOf(exCleric, doctrineKey)).toBe(SlotStatus.Hidden);
    expect(exCleric.build.choices[doctrineKey]).toBe(cloistered);
    expect(statusOf(exFighter, keyAttribute)).toBe(SlotStatus.Hidden);
    expect(String(exFighter.build.choices[keyAttribute])).toBe('dex');
  });
});
