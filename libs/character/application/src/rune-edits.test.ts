import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterName,
  CharacterPatchField,
  InventoryItemId,
  ItemQuantity,
  ItemRunesSchema,
} from '@pioneer/character/domain';
import type { Character, CharacterPatch } from '@pioneer/character/domain';
import {
  fundamental,
  fundamentalRef,
  humanAncestryId,
  ITEM_FIXTURES,
  ItemFixture,
  itemFixtureId,
  propertyRune,
  RuneFixture,
  runeFixtureId,
} from '@pioneer/character/domain/testing';
import { FundamentalRune } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId, ValidationError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const one = ItemQuantity.parse(1);

const POTENCY_1 = fundamental(FundamentalRune.Potency, 1);
const STRIKING_1 = fundamental(FundamentalRune.Striking, 1);
const FLAMING = propertyRune(RuneFixture.Flaming);

describe('CharacterService rune edits', () => {
  let service: CharacterService;
  let repository: InMemoryCharacterRepository;
  let character: Character;

  beforeEach(async () => {
    const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    repository = new InMemoryCharacterRepository();
    service = new CharacterService(repository, fixedContent(core, ITEM_FIXTURES), fixedClock('2026-10-11T10:00:00Z'));
    character = await service.create(amiri, { name: CharacterName.parse('Valeros'), ancestry: humanAncestryId });
  });

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

  test('etches, moves and erases runes, each audited by name', async () => {
    const sword = await add(ItemFixture.Longsword);
    const spare = await add(ItemFixture.Longsword);
    await edit({ field: CharacterPatchField.EtchRune, id: sword, rune: POTENCY_1 });
    await edit({ field: CharacterPatchField.EtchRune, id: sword, rune: STRIKING_1 });
    await edit({ field: CharacterPatchField.EtchRune, id: sword, rune: FLAMING });
    await edit({ field: CharacterPatchField.EtchRune, id: spare, rune: POTENCY_1 });
    await edit({ field: CharacterPatchField.TransferRune, id: sword, to: spare, rune: FLAMING });
    await edit({ field: CharacterPatchField.EraseRune, id: sword, rune: fundamentalRef(FundamentalRune.Striking) });
    expect(character.document.inventory.items.map(({ runes }) => runes)).toStrictEqual([
      ItemRunesSchema.parse({ potency: 1, property: [] }),
      ItemRunesSchema.parse({ potency: 1, property: [runeFixtureId(RuneFixture.Flaming)] }),
    ]);
    expect(repository.audits.map(({ command }) => command).slice(-6)).toStrictEqual([
      CharacterCommand.EtchRune,
      CharacterCommand.EtchRune,
      CharacterCommand.EtchRune,
      CharacterCommand.EtchRune,
      CharacterCommand.TransferRune,
      CharacterCommand.EraseRune,
    ]);
  });

  test('refuses a rune the rules do not allow, blaming the rune', async () => {
    const sword = await add(ItemFixture.Longsword);
    expect(await refusal({ field: CharacterPatchField.EtchRune, id: sword, rune: FLAMING })).toStrictEqual([
      {
        path: ['patch', 'rune'],
        message: { key: 'character.validation.propertyRunesFull', params: { maximum: 0 } },
      },
    ]);
  });

  test('refuses moving a rune onto an item the character has not, blaming where it goes', async () => {
    const sword = await add(ItemFixture.Longsword);
    await edit({ field: CharacterPatchField.EtchRune, id: sword, rune: POTENCY_1 });
    const missing = InventoryItemId.parse(newId());
    expect(
      await refusal({
        field: CharacterPatchField.TransferRune,
        id: sword,
        to: missing,
        rune: fundamentalRef(FundamentalRune.Potency),
      }),
    ).toStrictEqual([{ path: ['patch', 'to'], message: { key: 'character.validation.itemNotFound' } }]);
  });
});
