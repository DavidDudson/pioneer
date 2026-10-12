import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterName,
  CarryState,
  CharacterPatchField,
  CoinsSchema,
  HANDS_MAX,
  INVENTORY_ITEMS_MAX,
  InventoryItemId,
  InventoryItemName,
  ItemQuantity,
  ONE_HAND,
  STOWED,
} from '@pioneer/character/domain';
import type { Character, CharacterPatch } from '@pioneer/character/domain';
import {
  humanAncestryId,
  ITEM_FIXTURES,
  ItemFixture,
  itemFixtureId,
  KitFixture,
  kitFixtureId,
} from '@pioneer/character/domain/testing';
import { ContentId, ContentKind } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId, ValidationError, VersionConflictError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const one = ItemQuantity.parse(1);

/** The id of the one item `character` carries. */
function onlyItem(character: Character): InventoryItemId {
  const [item] = character.document.inventory.items;
  if (item === undefined) {
    throw new Error('Expected one item');
  }
  return item.id;
}

describe('CharacterService inventory edits', () => {
  let service: CharacterService;
  let repository: InMemoryCharacterRepository;
  let character: Character;

  beforeEach(async () => {
    const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    repository = new InMemoryCharacterRepository();
    service = new CharacterService(repository, fixedContent(core, ITEM_FIXTURES), fixedClock('2026-10-07T10:00:00Z'));
    character = await service.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  /** Applies `patch` to the character at its current version and keeps the result. */
  async function edit(patch: CharacterPatch): Promise<Character> {
    ({ character } = await service.patch(amiri, character.id, { expectedVersion: character.version, patch }));
    return character;
  }

  async function add(name: ItemFixture, container?: InventoryItemId): Promise<InventoryItemId> {
    const item = itemFixtureId(name);
    const saved = await edit({ field: CharacterPatchField.GiftItem, item, quantity: one, container });
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

  test('adds, stows, renames, recounts and removes items, each audited by name', async () => {
    const backpack = await add(ItemFixture.Backpack);
    const rope = await add(ItemFixture.Rope, backpack);
    await edit({ field: CharacterPatchField.RenameItem, id: rope, name: InventoryItemName.parse('Climbing rope') });
    await edit({ field: CharacterPatchField.SetItemQuantity, id: rope, quantity: ItemQuantity.parse(2) });
    await edit({ field: CharacterPatchField.MoveItem, id: rope });
    await edit({ field: CharacterPatchField.RemoveItem, id: backpack });
    await edit({ field: CharacterPatchField.SetCoins, coins: CoinsSchema.parse({ gp: 15 }) });

    expect(character.document.inventory).toStrictEqual({
      items: [
        {
          id: rope,
          item: itemFixtureId(ItemFixture.Rope),
          quantity: ItemQuantity.parse(2),
          name: InventoryItemName.parse('Climbing rope'),
          carry: STOWED,
        },
      ],
      coins: CoinsSchema.parse({ gp: 15 }),
    });
    expect(repository.audits.map(({ command }) => command)).toStrictEqual([
      CharacterCommand.CreateCharacter,
      CharacterCommand.GiftItem,
      CharacterCommand.GiftItem,
      CharacterCommand.RenameItem,
      CharacterCommand.SetItemQuantity,
      CharacterCommand.MoveItem,
      CharacterCommand.RemoveItem,
      CharacterCommand.SetCoins,
    ]);
  });

  test('gives every added item a fresh id', async () => {
    const first = await add(ItemFixture.Rope);
    const second = await add(ItemFixture.Rope);
    expect(first).not.toBe(second);
  });

  test('buys an item at its price times the quantity, with change, audited as buyItem', async () => {
    await edit({ field: CharacterPatchField.SetCoins, coins: CoinsSchema.parse({ gp: 2 }) });
    const sword = itemFixtureId(ItemFixture.Longsword);
    await edit({ field: CharacterPatchField.BuyItem, item: sword, quantity: one });
    const arrows = itemFixtureId(ItemFixture.Arrows);
    await edit({ field: CharacterPatchField.BuyItem, item: arrows, quantity: ItemQuantity.parse(15) });

    expect(character.document.inventory.items.map(({ item, quantity }) => ({ item, quantity }))).toStrictEqual([
      { item: sword, quantity: one },
      { item: arrows, quantity: ItemQuantity.parse(15) },
    ]);
    expect(character.document.inventory.coins).toStrictEqual(CoinsSchema.parse({ sp: 8, cp: 5 }));
    expect(repository.audits.map(({ command }) => command).slice(-2)).toStrictEqual([
      CharacterCommand.BuyItem,
      CharacterCommand.BuyItem,
    ]);
  });

  test('buys an item with no price for nothing', async () => {
    await edit({ field: CharacterPatchField.BuyItem, item: itemFixtureId(ItemFixture.Diamond), quantity: one });
    expect(character.document.inventory.items).toHaveLength(1);
    expect(character.document.inventory.coins).toStrictEqual(CoinsSchema.parse({}));
  });

  test('refuses a purchase the coins are worth less than, and changes nothing', async () => {
    await edit({ field: CharacterPatchField.SetCoins, coins: CoinsSchema.parse({ sp: 9, cp: 9 }) });
    const before = character;
    const sword = itemFixtureId(ItemFixture.Longsword);
    expect(await refusal({ field: CharacterPatchField.BuyItem, item: sword, quantity: one })).toStrictEqual([
      { path: ['patch', 'quantity'], message: { key: 'character.validation.cannotAfford' } },
    ]);
    expect(await service.get(amiri, character.id)).toStrictEqual(before);
  });

  test('adds a kit without paying: every item, what its backpack holds inside it, audited as giftKit', async () => {
    await edit({ field: CharacterPatchField.GiftKit, kit: kitFixtureId(KitFixture.Explorer) });

    const { items, coins } = character.document.inventory;
    const backpack = items.find((each) => each.item === itemFixtureId(ItemFixture.Backpack));
    expect(items.map(({ item, quantity, container }) => ({ item, quantity, inside: container === backpack?.id })))
      .toStrictEqual([
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
    expect(await refusal({ field: CharacterPatchField.GiftKit, kit: ContentId.parse(newId()) })).toStrictEqual([
      { path: ['patch', 'kit'], message: { key: 'character.validation.unknownKit' } },
    ]);
    const lost = new ContentPackBuilder()
      .withId('lost-kits')
      .withKit('lost', { items: [{ item: ContentId.parse(newId()), quantity: 1 }] });
    const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    const strict = new CharacterService(
      repository,
      fixedContent(core, ITEM_FIXTURES, lost.build()),
      fixedClock('2026-10-07T10:00:00Z'),
    );
    const patch = { field: CharacterPatchField.GiftKit, kit: ContentId.parse(lost.idOf(ContentKind.Kit, 'lost')) };
    const error = await rejection(strict.patch(amiri, character.id, { expectedVersion: character.version, patch }));
    expect((error as ValidationError).issues).toStrictEqual([
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

  test('refuses buying content no loaded pack has as an item', async () => {
    const unknown = ContentId.parse(newId());
    expect(await refusal({ field: CharacterPatchField.BuyItem, item: unknown, quantity: one })).toStrictEqual([
      { path: ['patch', 'item'], message: { key: 'character.validation.unknownItem' } },
    ]);
  });

  test('refuses content no loaded pack has as an item', async () => {
    const unknown = ContentId.parse(newId());
    expect(await refusal({ field: CharacterPatchField.GiftItem, item: unknown, quantity: one })).toStrictEqual([
      { path: ['patch', 'item'], message: { key: 'character.validation.unknownItem' } },
    ]);
  });

  test('refuses stowing in an item that holds nothing', async () => {
    const rope = await add(ItemFixture.Rope);
    const sword = itemFixtureId(ItemFixture.Longsword);
    expect(
      await refusal({ field: CharacterPatchField.GiftItem, item: sword, quantity: one, container: rope }),
    ).toStrictEqual([{ path: ['patch', 'container'], message: { key: 'character.validation.notAContainer' } }]);
  });

  test('refuses an edit to an item the character has not', async () => {
    const missing = InventoryItemId.parse(newId());
    expect(await refusal({ field: CharacterPatchField.RemoveItem, id: missing })).toStrictEqual([
      { path: ['patch', 'id'], message: { key: 'character.validation.itemNotFound' } },
    ]);
  });

  test('wears, holds and invests items, each audited by name', async () => {
    const armor = await add(ItemFixture.LeatherArmor);
    const sword = await add(ItemFixture.Greatsword);
    const cloak = await add(ItemFixture.Cloak);
    await edit({ field: CharacterPatchField.CarryItem, id: armor, carry: { state: CarryState.Worn } });
    await edit({
      field: CharacterPatchField.CarryItem,
      id: sword,
      carry: { state: CarryState.Held, hands: HANDS_MAX },
    });
    await edit({ field: CharacterPatchField.CarryItem, id: cloak, carry: { state: CarryState.Worn } });
    await edit({ field: CharacterPatchField.InvestItem, id: cloak, invested: true });

    expect(character.document.inventory.items.map(({ carry, invested }) => ({ carry, invested }))).toStrictEqual([
      { carry: { state: CarryState.Worn }, invested: undefined },
      { carry: { state: CarryState.Held, hands: HANDS_MAX }, invested: undefined },
      { carry: { state: CarryState.Worn }, invested: true },
    ]);
    expect(repository.audits.map(({ command }) => command).slice(-4)).toStrictEqual([
      CharacterCommand.CarryItem,
      CharacterCommand.CarryItem,
      CharacterCommand.CarryItem,
      CharacterCommand.InvestItem,
    ]);
  });

  test('refuses holding more than two hands hold', async () => {
    const sword = await add(ItemFixture.Greatsword);
    const rope = await add(ItemFixture.Rope);
    await edit({
      field: CharacterPatchField.CarryItem,
      id: sword,
      carry: { state: CarryState.Held, hands: HANDS_MAX },
    });
    expect(
      await refusal({
        field: CharacterPatchField.CarryItem,
        id: rope,
        carry: { state: CarryState.Held, hands: ONE_HAND },
      }),
    ).toStrictEqual([
      {
        path: ['patch', 'carry'],
        message: { key: 'character.validation.handsFull', params: { maximum: HANDS_MAX } },
      },
    ]);
  });

  test('refuses what content says can not be carried so', async () => {
    const sword = await add(ItemFixture.Greatsword);
    expect(
      await refusal({ field: CharacterPatchField.CarryItem, id: sword, carry: { state: CarryState.Worn } }),
    ).toStrictEqual([{ path: ['patch', 'carry'], message: { key: 'character.validation.notWearable' } }]);
    expect(
      await refusal({
        field: CharacterPatchField.CarryItem,
        id: sword,
        carry: { state: CarryState.Held, hands: ONE_HAND },
      }),
    ).toStrictEqual([{ path: ['patch', 'carry'], message: { key: 'character.validation.needsTwoHands' } }]);
  });

  test('refuses investing an item without the invested trait', async () => {
    const rope = await add(ItemFixture.Rope);
    expect(await refusal({ field: CharacterPatchField.InvestItem, id: rope, invested: true })).toStrictEqual([
      { path: ['patch', 'invested'], message: { key: 'character.validation.notInvestable' } },
    ]);
  });

  test('refuses putting a container inside something it holds', async () => {
    const backpack = await add(ItemFixture.Backpack);
    const pouch = await add(ItemFixture.Backpack, backpack);
    expect(await refusal({ field: CharacterPatchField.MoveItem, id: backpack, container: pouch })).toStrictEqual([
      { path: ['patch', 'container'], message: { key: 'character.validation.containerInsideItself' } },
    ]);
  });
});

describe('CharacterService inventory limits and staleness', () => {
  let service: CharacterService;
  let character: Character;

  beforeEach(async () => {
    const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    const repository = new InMemoryCharacterRepository();
    service = new CharacterService(repository, fixedContent(core, ITEM_FIXTURES), fixedClock('2026-10-07T10:00:00Z'));
    character = await service.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  const rope: CharacterPatch = {
    field: CharacterPatchField.GiftItem,
    item: itemFixtureId(ItemFixture.Rope),
    quantity: one,
  };

  test('refuses the item past the limit, so no edit can store a document that reads as corrupt', async () => {
    for (let count = 0; count < INVENTORY_ITEMS_MAX; count += 1) {
      // oxlint-disable-next-line no-await-in-loop -- each add needs the version the previous one saved
      ({ character } = await service.patch(amiri, character.id, { expectedVersion: character.version, patch: rope }));
    }
    const error = await rejection(
      service.patch(amiri, character.id, { expectedVersion: character.version, patch: rope }),
    );
    expect((error as ValidationError).issues).toStrictEqual([
      {
        path: ['patch', 'item'],
        message: { key: 'character.validation.inventoryFull', params: { maximum: INVENTORY_ITEMS_MAX } },
      },
    ]);
  });

  test('a stale edit is a conflict, not a refusal of the item it names', async () => {
    const stale = character.version;
    const { character: added } = await service.patch(amiri, character.id, { expectedVersion: stale, patch: rope });
    const removal: CharacterPatch = { field: CharacterPatchField.RemoveItem, id: onlyItem(added) };
    await service.patch(amiri, character.id, { expectedVersion: added.version, patch: removal });
    // A second tab, still at the version before the removal, removes the same item.
    const error = await rejection(
      service.patch(amiri, character.id, { expectedVersion: added.version, patch: removal }),
    );
    expect(error).toBeInstanceOf(VersionConflictError);
  });
});
