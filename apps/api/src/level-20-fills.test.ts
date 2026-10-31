import { describe, expect, test } from 'bun:test';

import {
  addItem,
  ANCESTRY_SLOT,
  CHARACTER_ROOT_SLOTS,
  EMPTY_INVENTORY,
  InventoryItemId,
  ItemQuantity,
} from '@pioneer/character/domain';
import type { CharacterDocument, SlotContent } from '@pioneer/character/domain';
import {
  BOOST_FIXTURES,
  CharacterBuilder,
  ItemFixture,
  itemFixtureContent,
  itemFixtureId,
  NO_FEATS,
  NO_LANGUAGES,
  NO_SKILLS,
  NO_SPELLS,
} from '@pioneer/character/domain/testing';
import { entry, idOf, lookupOf, slotOf } from '@pioneer/rules/grants/testing';
import { AncestryId, ContentKind, ContentText } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, installRulesFakes } from '@pioneer/rules/sdk/testing';

import { openFills } from './level-20-fills';

installRulesFakes();

/** An ancestry that asks for one of the weapons its character owns. */
const elf = {
  ...entry('elf', [{ key: 'ChoiceSet', flag: 'edge', choices: { ownedKinds: ['weapon'], filter: [] } }]),
  name: ContentText.parse('Elf'),
  kind: ContentKind.Ancestry,
};

const content: SlotContent = {
  lookup: lookupOf([elf]),
  namespaces: CORE_NAMESPACES,
  rootSlots: CHARACTER_ROOT_SLOTS,
  variantRoots: [],
  boosts: BOOST_FIXTURES,
  skills: NO_SKILLS,
  languages: NO_LANGUAGES,
  spells: NO_SPELLS,
  feats: NO_FEATS,
  items: itemFixtureContent(),
};

const EDGE_SLOT = slotOf('elf', 0);
const SWORD_LINE = InventoryItemId.parse('00000000-0000-4000-8000-000000000000');

/** An elf that carries a longsword, or nothing. */
function anElf(carrying: boolean): CharacterDocument {
  const { document } = new CharacterBuilder()
    .withAncestry(AncestryId.parse(idOf('elf')))
    .picking(String(ANCESTRY_SLOT), idOf('elf'))
    .build();
  const inventory = carrying
    ? addItem(EMPTY_INVENTORY, {
        id: SWORD_LINE,
        item: itemFixtureId(ItemFixture.Longsword),
        quantity: ItemQuantity.parse(1),
        container: undefined,
      })
    : EMPTY_INVENTORY;
  return { ...document, inventory };
}

/** The values the owned-item `ChoiceSet` slot would take, best first; none if the slot is not open. */
function edgeCandidates(document: CharacterDocument): readonly string[] | undefined {
  const fill = openFills(document, content).find(({ slot }) => slot === EDGE_SLOT);
  return fill?.candidates.map(String);
}

describe('the slots a level 20 build has to fill', () => {
  test('a ChoiceSet over owned items offers the weapons the character carries', () => {
    const offered = edgeCandidates(anElf(true));

    expect(offered).toEqual(['longsword']);
  });

  test('offers nothing from an empty inventory', () => {
    const offered = edgeCandidates(anElf(false));

    expect(offered).toEqual([]);
  });
});
