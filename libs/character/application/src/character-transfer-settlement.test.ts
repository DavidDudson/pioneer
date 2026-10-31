import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterCommand, CoinsSchema, TransferRefusal } from '@pioneer/character/domain';
import type { Character, CharacterId } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { fixedClock, newId, nextVersion, UserId, VersionConflictError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterTransferSettlement } from './character-transfer-settlement';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const create = { actor: amiri, command: CharacterCommand.CreateCharacter };

/** Serves the recipient as an earlier read had it, so the write finds it changed. */
class StaleRecipient extends InMemoryCharacterRepository {
  readonly #stale: CharacterId;

  public constructor(stale: CharacterId) {
    super();
    this.#stale = stale;
  }

  public override async findById(id: CharacterId): Promise<Character | undefined> {
    const found = await super.findById(id);
    return id === this.#stale && found !== undefined ? found.withVersion(nextVersion(found.version)) : found;
  }
}

describe('CharacterTransferSettlement', () => {
  let characters: InMemoryCharacterRepository;
  let settlement: CharacterTransferSettlement;
  let giver: Character;
  let recipient: Character;

  beforeEach(async () => {
    characters = new InMemoryCharacterRepository();
    settlement = new CharacterTransferSettlement(characters, fixedClock('2026-10-17T10:00:00Z'));
    const kyra = new CharacterBuilder().named('Kyra').ownedBy(amiri).build();
    giver = await characters.insert(
      kyra.withInventory({ items: [], customItems: [], coins: CoinsSchema.parse({ gp: 10 }) }, kyra.updatedAt),
      create,
    );
    recipient = await characters.insert(new CharacterBuilder().named('Mordred').ownedBy(ezren).build(), create);
  });

  test('coins move and both characters move on a version, written under the accepting command', async () => {
    const refusal = await settlement.giveCoins(ezren, {
      from: giver.id,
      to: recipient.id,
      giverVersion: giver.version,
      coins: CoinsSchema.parse({ gp: 4 }),
    });

    const after = { giver: await characters.findById(giver.id), recipient: await characters.findById(recipient.id) };
    expect(refusal).toBeUndefined();
    expect(after.giver?.document.inventory.coins).toStrictEqual(CoinsSchema.parse({ gp: 6 }));
    expect(after.recipient?.document.inventory.coins).toStrictEqual(CoinsSchema.parse({ gp: 4 }));
    expect(after.giver?.version).toBe(nextVersion(giver.version));
    expect(after.recipient?.version).toBe(nextVersion(recipient.version));
  });

  test('a giver changed since the offer is a version conflict and nothing is written', async () => {
    const failed = await rejection(
      settlement.giveCoins(ezren, {
        from: giver.id,
        to: recipient.id,
        giverVersion: nextVersion(giver.version),
        coins: CoinsSchema.parse({ gp: 4 }),
      }),
    );

    const untouched = await characters.findById(recipient.id);
    expect(failed).toBeInstanceOf(VersionConflictError);
    expect(untouched?.version).toBe(recipient.version);
  });

  test('a recipient changed while it was being written is a version conflict', async () => {
    const stale = new StaleRecipient(recipient.id);
    await stale.insert(giver, create);
    await stale.insert(recipient, create);

    const failed = await rejection(
      new CharacterTransferSettlement(stale, fixedClock('2026-10-17T10:00:00Z')).giveCoins(ezren, {
        from: giver.id,
        to: recipient.id,
        giverVersion: giver.version,
        coins: CoinsSchema.parse({ gp: 4 }),
      }),
    );

    expect(failed).toBeInstanceOf(VersionConflictError);
  });

  test('coins the giver does not hold are refused, not thrown', async () => {
    const refusal = await settlement.giveCoins(ezren, {
      from: giver.id,
      to: recipient.id,
      giverVersion: giver.version,
      coins: CoinsSchema.parse({ gp: 99 }),
    });

    const untouched = await characters.findById(giver.id);
    expect(refusal).toBe(TransferRefusal.ShortCoins);
    expect(untouched?.version).toBe(giver.version);
  });
});
