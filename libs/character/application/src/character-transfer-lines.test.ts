import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterId,
  CharacterName,
  InventoryItemId,
  InventoryItemName,
  ItemQuantity,
  KeyItemId,
  STOWED,
} from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { humanAncestryId, itemFixtureId, ItemFixture } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';

import { CharacterService } from './character-service';
import { CharacterTransferLines } from './character-transfer-lines';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const plain = InventoryItemId.parse(newId());
const keyed = InventoryItemId.parse(newId());

describe('CharacterTransferLines', () => {
  let lines: CharacterTransferLines;
  let mordred: Character;

  beforeEach(async () => {
    const clock = fixedClock('2026-10-17T10:00:00Z');
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    const repository = new InMemoryCharacterRepository();
    lines = new CharacterTransferLines(repository);
    mordred = await new CharacterService(repository, content, clock).create(amiri, {
      name: CharacterName.parse('Mordred'),
      ancestry: humanAncestryId,
    });
    const { inventory } = mordred.document;
    const base = { item: itemFixtureId(ItemFixture.Rope), quantity: ItemQuantity.parse(1), carry: STOWED };
    const items = [
      { ...base, id: plain },
      { ...base, id: keyed, name: InventoryItemName.parse('Caliburn'), keyItem: KeyItemId.parse(newId()) },
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

  test("describes a plain line with the character's version now", async () => {
    expect(await lines.describe(mordred.id, plain)).toStrictEqual({ keyItem: false, version: mordred.version });
  });

  test("flags a key item's line", async () => {
    expect(await lines.describe(mordred.id, keyed)).toMatchObject({ keyItem: true });
  });

  test("describes the purse with the character's version now", async () => {
    const purse = await lines.purse(mordred.id);
    const { coins } = mordred.document.inventory;

    expect(purse).toStrictEqual({ coins, version: mordred.version });
  });

  test('knows no purse of a character that is not there', async () => {
    const nobody = CharacterId.parse(newId());

    expect(await lines.purse(nobody)).toBeUndefined();
  });

  test('knows nothing of a line or a character that is not there', async () => {
    const elsewhere = await lines.describe(mordred.id, InventoryItemId.parse(newId()));
    const nobody = await lines.describe(CharacterId.parse(newId()), plain);

    expect([elsewhere, nobody]).toStrictEqual([undefined, undefined]);
  });
});
