import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterName,
  CharacterPatchField,
  CoinsSchema,
  ItemQuantity,
} from '@pioneer/character/domain';
import type { Character, CharacterPatch, InventoryItemId } from '@pioneer/character/domain';
import {
  humanAncestryId,
  ITEM_FIXTURES,
  ItemFixture,
  itemFixtureId,
  KIT_FIXTURES,
  KitFixture,
  kitFixtureId,
} from '@pioneer/character/domain/testing';
import { ContentId, ContentKind } from '@pioneer/rules/sdk';
import type { ContentPack } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId, ValidationError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const one = ItemQuantity.parse(1);
const clock = fixedClock('2026-10-07T10:00:00Z');
const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();

/** A kit of one item no loaded pack has. */
const lost = new ContentPackBuilder()
  .withId('lost-kits')
  .withKit('lost', { items: [{ item: ContentId.parse(newId()), quantity: 1 }] });
const lostKit = ContentId.parse(lost.idOf(ContentKind.Kit, 'lost'));

describe('CharacterService kit edits', () => {
  let service: CharacterService;
  let repository: InMemoryCharacterRepository;
  let character: Character;

  beforeEach(async () => {
    repository = new InMemoryCharacterRepository();
    const packs: readonly ContentPack[] = [core, ITEM_FIXTURES, KIT_FIXTURES, lost.build()];
    service = new CharacterService(repository, fixedContent(...packs), clock);
    character = await service.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  /** Applies `patch` to the character at its current version and keeps the result. */
  async function edit(patch: CharacterPatch): Promise<Character> {
    ({ character } = await service.patch(amiri, character.id, { expectedVersion: character.version, patch }));
    return character;
  }

  async function add(name: ItemFixture): Promise<InventoryItemId> {
    const saved = await edit({ field: CharacterPatchField.GiftItem, item: itemFixtureId(name), quantity: one });
    const added = saved.document.inventory.items.at(-1);
    if (added === undefined) {
      throw new Error('Nothing was added');
    }
    return added.id;
  }

  async function refusal(patch: CharacterPatch): Promise<unknown> {
    const error = await rejection(service.patch(amiri, character.id, { expectedVersion: character.version, patch }));
    expect(error).toBeInstanceOf(ValidationError);
    return (error as ValidationError).issues;
  }

  test('adds a kit without paying: every item, what its backpack holds inside it, audited as giftKit', async () => {
    await edit({ field: CharacterPatchField.GiftKit, kit: kitFixtureId(KitFixture.Explorer) });

    const { items, coins } = character.document.inventory;
    const backpack = items.find((each) => each.item === itemFixtureId(ItemFixture.Backpack));
    const lines = items.map(({ item, quantity, container }) => ({
      item,
      quantity,
      inside: container === backpack?.id,
    }));
    expect(lines).toStrictEqual([
      { item: itemFixtureId(ItemFixture.Backpack), quantity: one, inside: false },
      { item: itemFixtureId(ItemFixture.Rope), quantity: one, inside: true },
      { item: itemFixtureId(ItemFixture.Arrows), quantity: ItemQuantity.parse(10), inside: true },
      { item: itemFixtureId(ItemFixture.Longsword), quantity: one, inside: false },
    ]);
    expect(new Set(items.map((each) => each.id)).size).toBe(items.length);
    expect(coins).toStrictEqual(CoinsSchema.parse({}));
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.GiftKit);
  });

  test('buys a kit at its price, with change, stowed in a container, audited as buyKit', async () => {
    const bag = await add(ItemFixture.BagOfHolding);
    await edit({ field: CharacterPatchField.SetCoins, coins: CoinsSchema.parse({ pp: 1 }) });
    await edit({ field: CharacterPatchField.BuyKit, kit: kitFixtureId(KitFixture.Explorer), container: bag });

    const { items, coins } = character.document.inventory;
    expect(items.filter((each) => each.container === bag).map((each) => each.item)).toStrictEqual([
      itemFixtureId(ItemFixture.Backpack),
      itemFixtureId(ItemFixture.Longsword),
    ]);
    expect(coins).toStrictEqual(CoinsSchema.parse({ gp: 8 }));
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.BuyKit);
  });

  test('buys a kit with no price for nothing', async () => {
    await edit({ field: CharacterPatchField.BuyKit, kit: kitFixtureId(KitFixture.Keepsake) });
    expect(character.document.inventory.items.map((each) => each.item)).toStrictEqual([
      itemFixtureId(ItemFixture.Diamond),
    ]);
  });

  test('refuses a kit the coins are worth less than, and changes nothing', async () => {
    await edit({ field: CharacterPatchField.SetCoins, coins: CoinsSchema.parse({ gp: 1, sp: 9, cp: 9 }) });
    const before = character;
    const kit = kitFixtureId(KitFixture.Explorer);
    expect(await refusal({ field: CharacterPatchField.BuyKit, kit })).toStrictEqual([
      { path: ['patch', 'kit'], message: { key: 'character.validation.cannotAffordKit' } },
    ]);
    expect(await service.get(amiri, character.id)).toStrictEqual(before);
  });

  test('refuses a kit no loaded pack has, or one holding an item none has', async () => {
    const unknown = ContentId.parse(newId());
    expect(await refusal({ field: CharacterPatchField.GiftKit, kit: unknown })).toStrictEqual([
      { path: ['patch', 'kit'], message: { key: 'character.validation.unknownKit' } },
    ]);
    expect(await refusal({ field: CharacterPatchField.GiftKit, kit: lostKit })).toStrictEqual([
      { path: ['patch', 'kit'], message: { key: 'character.validation.unknownKitItem' } },
    ]);
  });

  test('refuses stowing a kit in an item that holds nothing', async () => {
    const rope = await add(ItemFixture.Rope);
    const kit = kitFixtureId(KitFixture.Explorer);
    expect(await refusal({ field: CharacterPatchField.GiftKit, kit, container: rope })).toStrictEqual([
      { path: ['patch', 'container'], message: { key: 'character.validation.notAContainer' } },
    ]);
  });
});
