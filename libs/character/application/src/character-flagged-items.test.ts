import { describe, expect, test } from 'bun:test';

import {
  addItem,
  Character,
  EMPTY_INVENTORY,
  InventoryItemId,
  INVESTED_MAX,
  ItemOrigin,
  ItemQuantity,
  RuleBreak,
} from '@pioneer/character/domain';
import type { Inventory, InventoryItem } from '@pioneer/character/domain';
import { CharacterBuilder, ITEM_FIXTURES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { fixedContent } from '@pioneer/rules/sdk/testing';

import { CharacterFlaggedItems } from './character-flagged-items';

const one = ItemQuantity.parse(1);

function idAt(index: number): InventoryItemId {
  return InventoryItemId.parse(`00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
}

function importedInvested(item: InventoryItem): InventoryItem {
  return { ...item, origin: ItemOrigin.Import, invested: true };
}

/** One rope more than can be invested, all of them imported and invested. */
function overInvested(): Inventory {
  let inventory = EMPTY_INVENTORY;
  for (let index = 0; index <= INVESTED_MAX; index += 1) {
    inventory = addItem(inventory, {
      id: idAt(index),
      item: itemFixtureId(ItemFixture.Rope),
      quantity: one,
      container: undefined,
    });
  }
  return { ...inventory, items: inventory.items.map((each) => importedInvested(each)) };
}

function withInventory(inventory: Inventory): Character {
  const built = new CharacterBuilder().named('Kyra').build();
  return new Character({
    document: { ...built.document, inventory },
    version: built.version,
    createdAt: built.createdAt,
    updatedAt: built.updatedAt,
  });
}

describe('CharacterFlaggedItems', () => {
  const flagged = new CharacterFlaggedItems(fixedContent(ITEM_FIXTURES));

  test('an inventory within the limits flags nothing', async () => {
    expect(await flagged.of(withInventory(EMPTY_INVENTORY))).toStrictEqual([]);
  });

  test('names the character, the item and the rule, with how far it is broken', async () => {
    const kyra = withInventory(overInvested());
    const lines = await flagged.of(kyra);
    expect(lines).toMatchObject([
      {
        character: kyra.id,
        characterName: 'Kyra',
        item: idAt(INVESTED_MAX),
        rule: RuleBreak.Invested,
        count: INVESTED_MAX + 1,
      },
    ]);
    expect(lines[0]?.itemName.length).toBeGreaterThan(0);
  });
});
