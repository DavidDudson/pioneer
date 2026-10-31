import { describe, expect, test } from 'bun:test';

import {
  CommonFacet,
  ContentKind,
  ContentRegistry,
  facetsFor,
  filterEntries,
  prerequisitesMetFacet,
  PREREQUISITES_MET_FACET,
} from '@pioneer/rules/sdk';
import type { FilterState, SlotKey } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { availableToYou, slotPrerequisiteStatus } from './available-to-you';
import { featSlots, PrerequisiteStatus } from './feat-slots';
import { slotContent } from './slot-offer';
import { CharacterBuilder, FEAT_SLOT_FIGHTER, FEAT_SLOT_FIXTURES, FEAT_SLOT_KEYS, skillFixtures } from './testing';

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
    expect(selection(state, CommonFacet.Traits)).toMatchObject({ include: ['fighter'], exclude: ['artifact'] });
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
