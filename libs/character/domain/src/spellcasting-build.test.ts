import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry, Selector } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { characterGrants, characterRanks, classContent, subclassSlot } from './class-build';
import { slotContent } from './slot-offer';
import { characterSpellcasting } from './spellcasting-build';
import { CharacterBuilder, PLAYER_CORE_CLASSES, playerCoreClasses, playerCoreClassId, playerCoreId } from './testing';
import type { PlayerCoreClass } from './testing';

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };
const classes = classContent(registry);

const KEY_ATTRIBUTE = 'boost:1:class:0';

function caster(name: PlayerCoreClass, level = 1): CharacterBuilder {
  return new CharacterBuilder()
    .named(name)
    .picking('class', playerCoreClassId(name))
    .picking(KEY_ATTRIBUTE, 'str')
    .atLevel(level);
}

/** The subclass slot's key for `name` at 1st level, and the id of its option `option`. */
function subclassPick(name: PlayerCoreClass, option: string): readonly [string, string] {
  const slot = subclassSlot(characterGrants(caster(name).build().document, content), content.lookup, classes);
  return [String(slot?.key), playerCoreId(ContentKind.ClassFeature, option)];
}

function entriesOf(builder: CharacterBuilder): string[] {
  const grants = characterGrants(builder.build().document, content);
  return characterSpellcasting(grants).map(
    ({ slug, tradition, attribute, preparation }) => `${slug} ${tradition} ${attribute} ${preparation}`,
  );
}

function rankOf(builder: CharacterBuilder, tradition: string): string | undefined {
  const ranks = characterRanks(characterGrants(builder.build().document, content));
  return ranks.get(Selector.parse(`spellcasting:${tradition}`));
}

const CASTERS: Readonly<Record<PlayerCoreClass, readonly string[]>> = {
  bard: ['bard occult cha spontaneous'],
  cleric: ['cleric divine wis prepared'],
  druid: ['druid primal wis prepared'],
  fighter: [],
  ranger: [],
  rogue: [],
  // The witch's tradition is its patron's, so the entry waits on the pick.
  witch: [],
  wizard: ['wizard arcane int prepared'],
};

describe('spellcasting entries of Player Core classes', () => {
  test.each([...PLAYER_CORE_CLASSES])('%s at 1st level', (name) => {
    expect(entriesOf(caster(name))).toEqual([...CASTERS[name]]);
  });

  test("a witch's entry comes with its patron, in the patron's tradition", () => {
    const [key, resentment] = subclassPick('witch', 'the-resentment');

    expect(entriesOf(caster('witch').picking(key, resentment))).toEqual(['witch occult int prepared']);
    expect(rankOf(caster('witch').picking(key, resentment), 'occult')).toBe('trained');
  });
});

describe('spellcasting rank', () => {
  test.each([
    [1, 'trained'],
    [6, 'trained'],
    [7, 'expert'],
    [15, 'master'],
    [19, 'legendary'],
  ])('a wizard at level %d is %s in arcane spellcasting', (level, rank) => {
    expect(rankOf(caster('wizard', level), 'arcane')).toBe(rank);
  });

  test.each([
    ['cloistered-cleric', 1, 'trained'],
    ['cloistered-cleric', 7, 'expert'],
    ['cloistered-cleric', 15, 'master'],
    ['cloistered-cleric', 19, 'legendary'],
    ['warpriest', 7, 'trained'],
    ['warpriest', 11, 'expert'],
    ['warpriest', 19, 'master'],
  ])('a %s at level %d is %s in divine spellcasting', (doctrine, level, rank) => {
    const [key, pick] = subclassPick('cleric', doctrine);

    expect(rankOf(caster('cleric', level).picking(key, pick), 'divine')).toBe(rank);
  });

  test('a cleric with no doctrine yet stays trained', () => {
    expect(rankOf(caster('cleric', 19), 'divine')).toBe('trained');
  });

  test('a class with no entry has no spellcasting rank', () => {
    expect(rankOf(caster('fighter', 19), 'arcane')).toBeUndefined();
  });
});
