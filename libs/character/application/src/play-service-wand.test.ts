import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterPatchField,
  CoinsSchema,
  InventoryItemId,
  InventoryItemSchema,
  ItemQuantity,
  PlayCommandField,
  ResourceCount,
  wandOverchargeKey,
  wandUseKey,
} from '@pioneer/character/domain';
import type { Character, CharacterPlay, InventoryItem, PlayCommand } from '@pioneer/character/domain';
import {
  CharacterBuilder,
  ITEM_FIXTURES,
  ItemFixture,
  itemFixtureId,
  playerCoreClasses,
  playerCoreClassId,
} from '@pioneer/character/domain/testing';
import { DieFace } from '@pioneer/rules/dice';
import { fixedContent } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock, newId, nextVersion, ValidationError } from '@pioneer/shared/kernel';
import type { Version } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const clock = fixedClock('2026-10-13T10:00:00Z');
const WAND = InventoryItemId.parse(newId());
const ONE = ResourceCount.parse(1);
const HELD = { state: 'held', hands: 1 };

function wandItem(fields: object = {}): InventoryItem {
  return InventoryItemSchema.parse({
    id: WAND,
    item: itemFixtureId(ItemFixture.FireballWand),
    quantity: ItemQuantity.parse(1),
    carry: HELD,
    ...fields,
  });
}

/** A 5th-level wizard, who casts 3rd-rank spells, holding the wand of Fireball as `fields` say. */
function wizardWith(fields: object = {}, name = 'Ezren'): Character {
  const wizard = new CharacterBuilder().named(name).atLevel(5).picking('class', playerCoreClassId('wizard')).build();
  return wizard.withInventory(
    { items: [wandItem(fields)], customItems: [], coins: CoinsSchema.parse({}) },
    clock.now(),
  );
}

const cast: PlayCommand = { field: PlayCommandField.CastWand, item: WAND };

function overcharge(roll?: number): PlayCommand {
  return roll === undefined
    ? { field: PlayCommandField.OverchargeWand, item: WAND }
    : { field: PlayCommandField.OverchargeWand, item: WAND, roll: DieFace.parse(roll) };
}

describe('PlayService wands', () => {
  let repository: InMemoryCharacterRepository;
  let characters: CharacterService;
  let play: PlayService;
  let ezren: Character;
  let revision: Version;

  async function insert(character: Character): Promise<void> {
    ezren = await repository.insert(character, { actor: character.ownerId, command: CharacterCommand.CreateCharacter });
    revision = FIRST_VERSION;
  }

  /** One play edit at the revision last answered. */
  async function patch(command: PlayCommand): Promise<CharacterPlay> {
    const saved = await play.patch(ezren.ownerId, ezren.id, { expectedRevision: revision, command });
    ({ revision } = saved);
    return saved;
  }

  beforeEach(async () => {
    const content = fixedContent(playerCoreClasses(), ITEM_FIXTURES);
    repository = new InMemoryCharacterRepository();
    characters = new CharacterService(repository, content, clock);
    play = new PlayService(repository, content, clock);
    await insert(wizardWith());
  });

  async function refused(command: PlayCommand): Promise<unknown> {
    return rejection(play.patch(ezren.ownerId, ezren.id, { expectedRevision: revision, command }));
  }

  async function itemsNow(): Promise<readonly InventoryItem[]> {
    const { document } = await characters.get(ezren.ownerId, ezren.id);
    return document.inventory.items;
  }

  test('the day cast spends the wand use and leaves the wand as it was', async () => {
    const saved = await patch(cast);
    expect(saved.play.resources.uses[wandUseKey(WAND)]).toBe(ONE);
    expect(await itemsNow()).toHaveLength(1);
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.CastWand);
    const stored = await characters.get(ezren.ownerId, ezren.id);
    expect(stored.version).toBe(ezren.version);
  });

  test('a second cast in the day is refused, and nothing is written', async () => {
    await patch(cast);
    expect(await refused(cast)).toBeInstanceOf(ValidationError);
    const kept = await play.get(ezren.ownerId, ezren.id);
    expect(kept.revision).toBe(revision);
  });

  test('an overcharge before the day cast is spent is refused', async () => {
    expect(await refused(overcharge(15))).toBeInstanceOf(ValidationError);
  });

  test('an overcharge needs its flat check rolled', async () => {
    await patch(cast);
    expect(await refused(overcharge())).toBeInstanceOf(ValidationError);
  });

  test('a passed overcharge spends the overcharge and breaks the wand, in one write', async () => {
    await patch(cast);
    const saved = await patch(overcharge(10));
    expect(saved.play.resources.uses[wandOverchargeKey(WAND)]).toBe(ONE);
    const [item] = await itemsNow();
    expect(item?.broken).toBe(true);
    const character = await characters.get(ezren.ownerId, ezren.id);
    expect(character.version).toBe(nextVersion(ezren.version));
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.OverchargeWand);
  });

  test('a failed overcharge destroys the wand', async () => {
    await patch(cast);
    await patch(overcharge(9));
    expect(await itemsNow()).toEqual([]);
  });

  test('a broken wand cannot be cast or overcharged until it is repaired', async () => {
    await patch(cast);
    await patch(overcharge(15));
    expect(await refused(overcharge(15))).toBeInstanceOf(ValidationError);
    const repaired = await characters.patch(ezren.ownerId, ezren.id, {
      expectedVersion: nextVersion(ezren.version),
      patch: { field: CharacterPatchField.SetItemBroken, id: WAND, broken: false },
    });
    expect(repaired.character.document.inventory.items[0]?.broken).toBeUndefined();
  });

  test('a wand overcharged already today is destroyed without a roll, even once repaired', async () => {
    await patch(cast);
    await patch(overcharge(15));
    await characters.patch(ezren.ownerId, ezren.id, {
      expectedVersion: nextVersion(ezren.version),
      patch: { field: CharacterPatchField.SetItemBroken, id: WAND, broken: false },
    });
    await patch(overcharge());
    expect(await itemsNow()).toEqual([]);
  });

  test('a wand that is stowed is no wand the character holds', async () => {
    await insert(wizardWith({ carry: { state: 'stowed' } }, 'Ezren Stowed'));
    expect(await refused(cast)).toBeInstanceOf(ValidationError);
  });

  test('a broken wand cannot be cast', async () => {
    await insert(wizardWith({ broken: true }, 'Ezren Broken'));
    expect(await refused(cast)).toBeInstanceOf(ValidationError);
  });
});
