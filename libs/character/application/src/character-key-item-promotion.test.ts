import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterName,
  InventoryItemId,
  InventoryItemName,
  ItemQuantity,
  ItemRunesSchema,
  KeyItemId,
  STOWED,
} from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { humanAncestryId, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { ConflictError, fixedClock, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterKeyItemPromotion } from './character-key-item-promotion';
import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const gm = UserId.parse(newId());
const caliburn = KeyItemId.parse(newId());
const line = InventoryItemId.parse(newId());
const flaming = itemFixtureId(ItemFixture.Rope);

describe('CharacterKeyItemPromotion', () => {
  let repository: InMemoryCharacterRepository;
  let promotion: CharacterKeyItemPromotion;
  let mordred: Character;

  beforeEach(async () => {
    const clock = fixedClock('2026-10-17T10:00:00Z');
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    repository = new InMemoryCharacterRepository();
    promotion = new CharacterKeyItemPromotion(repository, content, clock);
    mordred = await new CharacterService(repository, content, clock).create(amiri, {
      name: CharacterName.parse('Mordred'),
      ancestry: humanAncestryId,
    });
    const { inventory } = mordred.document;
    const items = [
      {
        id: line,
        item: itemFixtureId(ItemFixture.Rope),
        quantity: ItemQuantity.parse(1),
        name: InventoryItemName.parse('Caliburn'),
        carry: STOWED,
        runes: ItemRunesSchema.parse({ property: [flaming] }),
      },
    ];
    mordred = await repository.update(
      mordred.withInventory({ ...inventory, items }, mordred.updatedAt),
      mordred.version,
      {
        actor: amiri,
        command: CharacterCommand.GiftItem,
      },
    );
  });

  async function keyOfLine(): Promise<KeyItemId | undefined> {
    const found = await repository.findById(mordred.id);
    return found?.document.inventory.items.find((each) => each.id === line)?.keyItem;
  }

  test('describes the line by the name it shows and the runes on it', async () => {
    const described = await promotion.describe(mordred.id, line);

    expect(described).toMatchObject({ name: 'Caliburn', keyItem: undefined });
    const runes = described?.property.map(({ rune }) => rune);
    expect(runes).toStrictEqual([flaming]);
  });

  test('a line or character that is gone describes as nothing', async () => {
    const gone = InventoryItemId.parse(newId());
    const described = await promotion.describe(mordred.id, gone);
    expect(described).toBeUndefined();
  });

  test('links the line in place, as the GM, and adds no second line', async () => {
    await promotion.link(gm, mordred.id, { item: line, keyItem: caliburn });

    const found = await repository.findById(mordred.id);
    expect(found?.document.inventory.items).toHaveLength(1);
    expect(await keyOfLine()).toBe(caliburn);
    expect(repository.audits.at(-1)).toStrictEqual({ actor: gm, command: CharacterCommand.LinkKeyItem });
  });

  test('linking twice is no change, and a line of another key item is a conflict', async () => {
    await promotion.link(gm, mordred.id, { item: line, keyItem: caliburn });
    await promotion.link(gm, mordred.id, { item: line, keyItem: caliburn });
    const other = KeyItemId.parse(newId());
    const refused = await rejection(promotion.link(gm, mordred.id, { item: line, keyItem: other }));

    const links = repository.audits.filter((each) => each.command === CharacterCommand.LinkKeyItem);
    expect(links).toHaveLength(1);
    expect(refused).toBeInstanceOf(ConflictError);
  });

  test('a line that is gone is a 404', async () => {
    const gone = InventoryItemId.parse(newId());
    const refused = await rejection(promotion.link(gm, mordred.id, { item: gone, keyItem: caliburn }));

    expect(refused).toBeInstanceOf(NotFoundError);
  });
});
