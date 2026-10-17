import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CampaignCharacterId,
  CampaignMemberId,
  CharacterId,
  CreateKeyItemBody,
  KeyItemId,
  ReviewedRuneId,
} from '@pioneer/campaign/domain';
import type { Campaign, CampaignId, CampaignKeyItems } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { fixedClock, ForbiddenError, newId, NotFoundError, Temporal, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CampaignKeyItemService } from './campaign-key-item-service';
import type { KeyItemRef } from './campaign-key-item-service';
import { InMemoryCampaignKeyItemRepository } from './in-memory-campaign-key-item-repository';
import { InMemoryCampaignPartyRepository } from './in-memory-campaign-party-repository';
import { InMemoryCampaignRepository } from './in-memory-campaign-repository';
import { InMemoryCharacterDirectory } from './in-memory-character-directory';
import { InMemoryKeyItemHolders } from './in-memory-key-item-holders';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const stranger = UserId.parse(newId());
const kyra = CharacterId.parse(newId());
const mordred = CharacterId.parse(newId());
const outsider = CharacterId.parse(newId());

const PROPERTY_RUNES = ['Flaming', 'Frost', 'Shock', 'Corrosive', 'Ghost Touch', 'Grievous'];

/** Caliburn: a longsword with six property runes, one more than the table allows. */
const caliburn = CreateKeyItemBody.parse({
  name: 'Caliburn',
  base: { item: newId(), name: 'Longsword' },
  runes: {
    potency: 3,
    property: PROPERTY_RUNES.map((name) => ({ rune: newId(), name })),
  },
  notes: 'Drawn from the stone.',
});

/** The id of the only key item in the list. */
function only(items: CampaignKeyItems): KeyItemId {
  return KeyItemId.parse(items.keyItems[0]?.id);
}

/** The key item as a route names it. */
function refTo(keyItemId: KeyItemId, id: CampaignId): KeyItemRef {
  return { id, keyItemId };
}

function memberIdOf(campaign: Campaign, userId: UserId): CampaignMemberId {
  return CampaignMemberId.parse(campaign.members.find((each) => each.userId === userId)?.id);
}

describe('CampaignKeyItemService', () => {
  let keyItems: InMemoryCampaignKeyItemRepository;
  let holders: InMemoryKeyItemHolders;
  let service: CampaignKeyItemService;
  let vaults: Campaign;

  beforeEach(async () => {
    const campaigns = new InMemoryCampaignRepository();
    const party = new InMemoryCampaignPartyRepository(campaigns);
    keyItems = new InMemoryCampaignKeyItemRepository();
    holders = new InMemoryKeyItemHolders();
    service = new CampaignKeyItemService(
      {
        campaigns,
        keyItems,
        party,
        holders,
        characters: new InMemoryCharacterDirectory()
          .character({ id: kyra, ownerId: ezren, name: 'Kyra' })
          .character({ id: mordred, ownerId: ezren, name: 'Mordred' })
          .character({ id: outsider, ownerId: stranger, name: 'Outsider' }),
      },
      fixedClock('2026-10-17T10:00:00Z'),
    );
    vaults = await campaigns.insert(new CampaignBuilder().ranBy(amiri).withPlayer(ezren).build());
    const memberId = memberIdOf(vaults, ezren);
    const attachedAt = Temporal.Instant.from('2026-10-10T10:00:00Z');
    await Promise.all(
      [kyra, mordred].map(async (characterId) =>
        party.attach(vaults.id, { id: CampaignCharacterId.parse(newId()), characterId, memberId, attachedAt }),
      ),
    );
  });

  test('the GM creates a key item runes and all, held by the party stash', async () => {
    const created = await service.create(amiri, vaults.id, caliburn);

    expect(created.manageable).toBe(true);
    expect(created.keyItems).toMatchObject([{ name: 'Caliburn', holder: undefined }]);
    expect(created.keyItems[0]?.runes.property).toHaveLength(6);
  });

  test('a player is refused every change with a 403, and a stranger finds nothing', async () => {
    const ref = refTo(only(await service.create(amiri, vaults.id, caliburn)), vaults.id);
    const body = { characterId: kyra };

    const refused = await Promise.all([
      rejection(service.create(ezren, vaults.id, caliburn)),
      rejection(service.give(ezren, ref, body)),
      rejection(service.takeBack(ezren, ref)),
      rejection(service.archive(ezren, ref)),
    ]);
    const hidden = await rejection(service.list(stranger, vaults.id));

    expect(refused.every((error) => error instanceof ForbiddenError)).toBe(true);
    expect(hidden).toBeInstanceOf(NotFoundError);
  });

  test('every member sees the key items and who holds them, read-only for a player', async () => {
    const key = only(await service.create(amiri, vaults.id, caliburn));
    await service.give(amiri, refTo(key, vaults.id), { characterId: kyra });

    const seen = await service.list(ezren, vaults.id);

    expect(seen.manageable).toBe(false);
    expect(seen.keyItems).toMatchObject([{ name: 'Caliburn', holder: kyra, holderName: 'Kyra' }]);
  });

  test('giving writes the holder a line; giving it to the holder again changes nothing', async () => {
    const keyItem = only(await service.create(amiri, vaults.id, caliburn));

    await service.give(amiri, refTo(keyItem, vaults.id), { characterId: kyra });
    await service.give(amiri, refTo(keyItem, vaults.id), { characterId: kyra });

    expect(holders.linesOf(kyra)).toStrictEqual([keyItem]);
    expect(holders.actors).toStrictEqual([amiri]);
  });

  test('transferring moves the line from the old holder to the new one', async () => {
    const keyItem = only(await service.create(amiri, vaults.id, caliburn));
    await service.give(amiri, refTo(keyItem, vaults.id), { characterId: kyra });

    const moved = await service.give(amiri, refTo(keyItem, vaults.id), { characterId: mordred });

    expect(moved.keyItems).toMatchObject([{ holder: mordred, holderName: 'Mordred' }]);
    expect(holders.linesOf(kyra)).toStrictEqual([]);
    expect(holders.linesOf(mordred)).toStrictEqual([keyItem]);
  });

  test('a character outside the party, or a key item the campaign lacks, is a 404', async () => {
    const ref = refTo(only(await service.create(amiri, vaults.id, caliburn)), vaults.id);
    const missing = refTo(KeyItemId.parse(newId()), vaults.id);

    const refused = await Promise.all([
      rejection(service.give(amiri, ref, { characterId: outsider })),
      rejection(service.give(amiri, missing, { characterId: kyra })),
      rejection(service.takeBack(amiri, missing)),
    ]);

    expect(refused.every((error) => error instanceof NotFoundError)).toBe(true);
  });

  test('taking back removes the line and returns it to the stash, harmlessly twice', async () => {
    const keyItem = only(await service.create(amiri, vaults.id, caliburn));
    await service.give(amiri, refTo(keyItem, vaults.id), { characterId: kyra });

    await service.takeBack(amiri, refTo(keyItem, vaults.id));
    const again = await service.takeBack(amiri, refTo(keyItem, vaults.id));

    expect(again.keyItems).toMatchObject([{ holder: undefined }]);
    expect(holders.linesOf(kyra)).toStrictEqual([]);
  });

  test('archiving takes the line, leaves the list and keeps the history', async () => {
    const keyItem = only(await service.create(amiri, vaults.id, caliburn));
    await service.give(amiri, refTo(keyItem, vaults.id), { characterId: kyra });

    const archived = await service.archive(amiri, refTo(keyItem, vaults.id));
    const again = await service.archive(amiri, refTo(keyItem, vaults.id));

    expect(archived.keyItems).toStrictEqual([]);
    expect(again.keyItems).toStrictEqual([]);
    expect(holders.linesOf(kyra)).toStrictEqual([]);
    expect(keyItems.archivedOf(vaults.id)).toMatchObject([{ id: keyItem, holder: kyra }]);
  });

  test('the rune ids are the ones the GM stated', async () => {
    const created = await service.create(amiri, vaults.id, caliburn);
    const stated = caliburn.runes.property.map(({ rune }) => rune);

    expect(created.keyItems[0]?.runes.property.map(({ rune }) => rune)).toStrictEqual(stated);
    expect(stated.every((rune) => ReviewedRuneId.safeParse(rune).success)).toBe(true);
  });
});
