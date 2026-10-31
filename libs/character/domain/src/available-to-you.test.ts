import { describe, expect, test } from 'bun:test';

import {
  CommonFacet,
  ContentKind,
  ContentRegistry,
  facetsFor,
  filterEntries,
  PREREQUISITES_MET_FACET,
  prerequisitesMetFacet,
} from '@pioneer/rules/sdk';
import type { FilterState, SlotKey } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { availableSpellsToYou, availableToYou, slotPrerequisiteStatus } from './available-to-you';
import { featSlots, PrerequisiteStatus } from './feat-slots';
import { preparedSlots } from './prepared-spells';
import { preparedReads, slotContent } from './slot-offer';
import {
  CharacterBuilder,
  FEAT_SLOT_FIGHTER,
  FEAT_SLOT_FIXTURES,
  FEAT_SLOT_KEYS,
  playerCoreClasses,
  playerCoreClassId,
  skillFixtures,
  spellFixtures,
} from './testing';

const { level1: LEVEL_1, level2: LEVEL_2, level4: LEVEL_4, bonus: BONUS } = FEAT_SLOT_KEYS;

const registry = new ContentRegistry();
registry.register(skillFixtures());
registry.register(FEAT_SLOT_FIXTURES);
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const FEATS = FEAT_SLOT_FIXTURES.otherEntries.filter(({ kind }) => kind === ContentKind.Feat);

const fighter = (level: number): CharacterBuilder =>
  new CharacterBuilder().picking('class', FEAT_SLOT_FIGHTER).atLevel(level);

/** What the preset keeps of the fixture feats for `slot`, by name, read through the facets as the picker will. */
function kept(character: CharacterBuilder, slot: SlotKey): readonly string[] {
  const { document } = character.build();
  const facets = [...facetsFor(['feat']), prerequisitesMetFacet(slotPrerequisiteStatus(document, content, slot))];
  const state = availableToYou(document, content, slot);
  return filterEntries(FEATS, facets, state)
    .map(({ name }) => name.toLowerCase())
    .toSorted();
}

/** The feats `slot` offers whose prerequisites are not unmet, by name, as the slot itself reads them. */
function notUnmet(character: CharacterBuilder, slot: SlotKey): readonly string[] {
  const options = featSlots(character.build().document, content).find(({ key }) => key === slot)?.options ?? [];
  return options
    .filter(({ status }) => status !== PrerequisiteStatus.Unmet)
    .map(({ label }) => label.toLowerCase())
    .toSorted();
}

function selection(state: FilterState, id: string): unknown {
  return [...state].find(([facet]) => facet === id)?.[1];
}

describe('availableToYou', () => {
  test('caps the level at the slot, not the character, and asks for the slot trait', () => {
    const state = availableToYou(fighter(10).build().document, content, LEVEL_2);

    expect(selection(state, CommonFacet.Level)).toMatchObject({ max: 2 });
    expect(selection(state, CommonFacet.Traits)).toMatchObject({
      include: ['fighter'],
      exclude: ['artifact'],
    });
    expect(selection(state, CommonFacet.Rarity)).toMatchObject({ exclude: ['unique'] });
    expect(selection(state, PREREQUISITES_MET_FACET)).toMatchObject({ exclude: ['unmet'] });
  });

  test('a slot opening later caps at its own level', () => {
    const state = availableToYou(fighter(8).build().document, content, BONUS);

    expect(selection(state, CommonFacet.Level)).toMatchObject({ max: 8 });
  });

  test('keeps feats whose prerequisites are met or unknown, drops unmet', () => {
    expect(kept(fighter(1), LEVEL_1)).toEqual(['keen-eye', 'power-attack', 'reactive-shield', 'skill-training']);
  });

  test.each([
    [1, LEVEL_1],
    [2, LEVEL_2],
    [4, LEVEL_4],
    [8, BONUS],
  ] as const)('at level %d, agrees with what slot %s reports as not unmet', (level, slot) => {
    const character = fighter(level);

    expect(kept(character, slot)).toEqual(notUnmet(character, slot));
  });
});

const spellRegistry = new ContentRegistry();
spellRegistry.register(playerCoreClasses());
spellRegistry.register(spellFixtures());
const spellContent = { ...slotContent(spellRegistry), namespaces: CORE_NAMESPACES };
const SPELLS = spellFixtures().otherEntries.filter(({ kind }) => kind === ContentKind.Spell);
const SPELL_FACETS = facetsFor([ContentKind.Spell]);

const wizard = (level: number): CharacterBuilder =>
  new CharacterBuilder()
    .named('wizard')
    .picking('class', playerCoreClassId('wizard'))
    .picking('boost:1:class:0', 'str')
    .atLevel(level);

/** What a spell slot offers, with the spells its preset keeps of the fixtures, both by name. */
interface SpellSlotRead {
  readonly kept: readonly string[];
  readonly offered: readonly string[];
  /** The slot's offer above `rank` that is not a cantrip. */
  readonly offeredAbove: (rank: number) => readonly string[];
}

/** The names of `spells`, lowercase and sorted. */
const names = (spells: readonly { readonly name: string }[]): readonly string[] =>
  spells.map(({ name }) => name.toLowerCase()).toSorted();

/** The preset of the 5th-level wizard's slot `key`, read through the spell facets as the picker will. */
function readSlot(key: string): SpellSlotRead {
  const { document } = wizard(5).build();
  const slot = preparedSlots(document, preparedReads(document, spellContent)).find((each) => each.key === key);
  expect(slot).toBeDefined();
  const options = slot?.options ?? [];
  const state = slot === undefined ? new Map() : availableSpellsToYou(slot);
  return {
    kept: names(filterEntries(SPELLS, SPELL_FACETS, state)),
    offered: names(options),
    offeredAbove: (rank) => names(options.filter((spell) => spell.rank > rank && !spell.cantrip)),
  };
}

describe('availableSpellsToYou', () => {
  test('a cantrip slot keeps every cantrip it offers', () => {
    const { kept: keptSpells, offered } = readSlot('prepared:wizard:cantrip:0');

    expect(offered.length).toBeGreaterThan(0);
    expect(offered.filter((name) => !keptSpells.includes(name))).toStrictEqual([]);
  });

  test('a spell slot keeps every spell it offers', () => {
    const { kept: keptSpells, offered } = readSlot('prepared:wizard:3:0');

    expect(offered.length).toBeGreaterThan(0);
    expect(offered.filter((name) => !keptSpells.includes(name))).toStrictEqual([]);
  });

  test('keeps no spell of a higher rank than the slot', () => {
    const { kept: keptFirst } = readSlot('prepared:wizard:1:0');
    const above = readSlot('prepared:wizard:3:0').offeredAbove(1);

    expect(above.length).toBeGreaterThan(0);
    expect(above.filter((name) => keptFirst.includes(name))).toStrictEqual([]);
  });
});
