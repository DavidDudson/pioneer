import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterName,
  InventoryItemId,
  InventoryItemName,
  ItemQuantity,
  KeyItemId,
} from '@pioneer/character/domain';
import type { Character, ItemRunes, KeyItemLine } from '@pioneer/character/domain';
import { humanAncestryId, itemFixtureId, ItemFixture } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';

import { CharacterKeyItems } from './character-key-items';
import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const gm = UserId.parse(newId());
const caliburn = KeyItemId.parse(newId());

const line: KeyItemLine = {
  id: InventoryItemId.parse(newId()),
  keyItem: caliburn,
  item: itemFixtureId(ItemFixture.Rope),
  quantity: ItemQuantity.parse(1),
  name: InventoryItemName.parse('Caliburn'),
  runes: undefined,
};

describe('CharacterKeyItems', () => {
  let repository: InMemoryCharacterRepository;
  let keyItems: CharacterKeyItems;
  let kyra: Character;

  beforeEach(async () => {
    const clock = fixedClock('2026-10-17T10:00:00Z');
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    repository = new InMemoryCharacterRepository();
    keyItems = new CharacterKeyItems(repository, clock);
    kyra = await new CharacterService(repository, content, clock).create(amiri, {
      name: CharacterName.parse('Kyra'),
      ancestry: humanAncestryId,
    });
  });

  async function held(): Promise<Character['document']['inventory']['items']> {
    const found = await repository.findById(kyra.id);
    return found?.document.inventory.items ?? [];
  }

  test('giving adds the key item as a stowed line linked to it, as the GM, not the owner', async () => {
    await keyItems.give(gm, kyra.id, line);

    const [added] = await held();
    expect(added?.keyItem).toBe(caliburn);
    expect(added?.carry.state).toBe('stowed');
    expect(repository.audits.at(-1)).toStrictEqual({ actor: gm, command: CharacterCommand.GiveKeyItem });
  });

  test('giving it again does not add a second line', async () => {
    await keyItems.give(gm, kyra.id, line);
    await keyItems.give(gm, kyra.id, line);

    expect(await held()).toHaveLength(1);
  });

  test('a line past the player limits is kept as stated', async () => {
    const runes: ItemRunes = { property: Array.from({ length: 5 }, () => itemFixtureId(ItemFixture.Rope)) };
    await keyItems.give(gm, kyra.id, { ...line, runes });

    const [added] = await held();
    expect(added?.runes?.property).toHaveLength(5);
  });

  test('taking back removes the line, and taking back twice is no change', async () => {
    await keyItems.give(gm, kyra.id, line);
    await keyItems.takeBack(gm, kyra.id, caliburn);
    await keyItems.takeBack(gm, kyra.id, caliburn);

    expect(await held()).toHaveLength(0);
    expect(repository.audits.filter((each) => each.command === CharacterCommand.TakeBackKeyItem)).toHaveLength(1);
  });
});
