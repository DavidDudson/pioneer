import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterName,
  CharacterPatchField,
  CoinChangeSchema,
  CoinsSchema,
  LedgerNote,
  LedgerReason,
} from '@pioneer/character/domain';
import type { Character, CharacterPatch } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId, ValidationError } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());

describe('CharacterService coin gifts and takes', () => {
  let service: CharacterService;
  let repository: InMemoryCharacterRepository;
  let character: Character;

  beforeEach(async () => {
    const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    repository = new InMemoryCharacterRepository();
    service = new CharacterService(repository, fixedContent(core), fixedClock('2026-10-07T10:00:00Z'));
    character = await service.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  /** Applies `patch` to the character at its current version and keeps the result. */
  async function edit(patch: CharacterPatch): Promise<Character> {
    ({ character } = await service.patch(amiri, character.id, { expectedVersion: character.version, patch }));

    return character;
  }

  /** The issues the service refuses `patch` with. */
  async function refusal(patch: CharacterPatch): Promise<ReadonlyArray<FieldIssue>> {
    const error = await rejection(service.patch(amiri, character.id, { expectedVersion: character.version, patch }));

    if (!(error instanceof ValidationError)) {
      throw new TypeError(`Expected a ValidationError, got ${String(error)}`);
    }

    return error.issues;
  }

  test('gifts and takes coins, each audited by name with its reason and note', async () => {
    const note = LedgerNote.parse('Goblin chief');
    await edit({
      field: CharacterPatchField.GiftCoins,
      coins: CoinsSchema.parse({ pp: 1, gp: 2, cp: 3 }),
      reason: LedgerReason.Loot,
      note,
    });
    await edit({
      field: CharacterPatchField.TakeCoins,
      coins: CoinsSchema.parse({ gp: 1, cp: 3 }),
      reason: LedgerReason.Gift,
    });

    expect(character.document.inventory.coins).toStrictEqual(CoinsSchema.parse({ pp: 1, gp: 1 }));
    expect(character.document.inventory.ledger).toStrictEqual([
      expect.objectContaining({
        reason: LedgerReason.Loot,
        change: CoinChangeSchema.parse({ pp: 1, gp: 2, cp: 3 }),
        note,
      }),
      expect.objectContaining({ reason: LedgerReason.Gift, change: CoinChangeSchema.parse({ gp: -1, cp: -3 }) }),
    ]);
    expect(repository.audits.map(({ command }) => command).slice(-2)).toStrictEqual([
      CharacterCommand.GiftCoins,
      CharacterCommand.TakeCoins,
    ]);
  });

  test('refuses taking coins the purse is worth less than, and changes nothing', async () => {
    await edit({ field: CharacterPatchField.SetCoins, coins: CoinsSchema.parse({ sp: 9, cp: 9 }) });
    const before = character;

    expect(
      await refusal({
        field: CharacterPatchField.TakeCoins,
        coins: CoinsSchema.parse({ gp: 1 }),
        reason: LedgerReason.Loot,
      }),
    ).toStrictEqual([{ path: ['patch', 'coins'], message: { key: 'character.validation.cannotTakeCoins' } }]);
    expect(await service.get(amiri, character.id)).toStrictEqual(before);
  });

  test('refuses a gift the purse cannot hold, and changes nothing', async () => {
    await edit({ field: CharacterPatchField.SetCoins, coins: CoinsSchema.parse({ cp: 2_147_483_000 }) });
    const before = character;

    expect(
      await refusal({
        field: CharacterPatchField.GiftCoins,
        coins: CoinsSchema.parse({ cp: 1000 }),
        reason: LedgerReason.Gift,
      }),
    ).toStrictEqual([{ path: ['patch', 'coins'], message: { key: 'character.validation.cannotHoldCoins' } }]);
    expect(await service.get(amiri, character.id)).toStrictEqual(before);
  });
});
