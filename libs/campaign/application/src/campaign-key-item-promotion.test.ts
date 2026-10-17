import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CampaignCharacterId,
  CampaignMemberId,
  CharacterId,
  ItemRule,
  KeyItemId,
  KeyItemName,
  KeyItemNotes,
  KeyItemRunes,
  promotedKeyItemId,
  ReviewedItemId,
  ReviewedName,
  ReviewedRuneId,
} from '@pioneer/campaign/domain';
import type { Campaign, PromoteItemBody } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import {
  ConflictError,
  fixedClock,
  ForbiddenError,
  newId,
  NotFoundError,
  Temporal,
  UserId,
} from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { flag } from './campaign-item-approval-testing';
import { CampaignKeyItemService } from './campaign-key-item-service';
import { InMemoryCampaignKeyItemRepository } from './in-memory-campaign-key-item-repository';
import { InMemoryCampaignPartyRepository } from './in-memory-campaign-party-repository';
import { InMemoryCampaignRepository } from './in-memory-campaign-repository';
import { InMemoryCharacterDirectory } from './in-memory-character-directory';
import { InMemoryFlaggedItems } from './in-memory-flagged-items';
import { InMemoryKeyItemHolders } from './in-memory-key-item-holders';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const mordred = CharacterId.parse(newId());
const line = ReviewedItemId.parse(newId());
const rules = KeyItemRunes.parse({ potency: 3, property: [{ rune: newId(), name: 'Flaming' }] });

/** Mordred's Caliburn line, broken by property runes. */
const caliburn: PromoteItemBody = { character: mordred, item: line, rule: ItemRule.PropertyRunes };

describe('promoting a flagged item to a key item', () => {
  let keyItems: InMemoryCampaignKeyItemRepository;
  let holders: InMemoryKeyItemHolders;
  let flagged: InMemoryFlaggedItems;
  let service: CampaignKeyItemService;
  let vaults: Campaign;

  beforeEach(async () => {
    const campaigns = new InMemoryCampaignRepository();
    const party = new InMemoryCampaignPartyRepository(campaigns);
    keyItems = new InMemoryCampaignKeyItemRepository();
    holders = new InMemoryKeyItemHolders().hasLine(mordred, line, {
      name: KeyItemName.parse('Caliburn'),
      runes: rules,
    });
    flagged = new InMemoryFlaggedItems();
    service = new CampaignKeyItemService(
      {
        campaigns,
        keyItems,
        party,
        holders,
        flagged,
        characters: new InMemoryCharacterDirectory().character({ id: mordred, ownerId: ezren, name: 'Mordred' }),
      },
      fixedClock('2026-10-17T10:00:00Z'),
    );
    vaults = await campaigns.insert(new CampaignBuilder().ranBy(amiri).withPlayer(ezren).build());
    const memberId = CampaignMemberId.parse(vaults.members.find((each) => each.userId === ezren)?.id);
    await party.attach(vaults.id, {
      id: CampaignCharacterId.parse(newId()),
      characterId: mordred,
      memberId,
      attachedAt: Temporal.Instant.from('2026-10-10T10:00:00Z'),
    });
    flagged.flag(vaults.id, [flag(caliburn, 6)]);
  });

  test('copies the name, base item and runes, held by the line character', async () => {
    const promoted = await service.promote(amiri, vaults.id, caliburn);

    expect(promoted.keyItems).toMatchObject([
      { name: 'Caliburn', base: { name: 'Longsword' }, holder: mordred, holderName: 'Mordred' },
    ]);
    expect(promoted.keyItems[0]?.runes).toStrictEqual(rules);
  });

  test('links the existing line and adds no second one', async () => {
    const promoted = await service.promote(amiri, vaults.id, caliburn);

    expect(holders.linkOf(line)).toBe(promoted.keyItems[0]?.id);
    expect(holders.linesOf(mordred)).toStrictEqual([promotedKeyItemId(vaults.id, caliburn)]);
    expect(holders.actors).toStrictEqual([amiri]);
  });

  test('promoting again changes nothing, as the line is flagged no more', async () => {
    await service.promote(amiri, vaults.id, caliburn);
    flagged.flag(vaults.id, []);

    const again = await service.promote(amiri, vaults.id, caliburn);

    expect(again.keyItems).toHaveLength(1);
  });

  test('a retry after the link failed finishes the job with the same single key item', async () => {
    await keyItems.insert(amiri, vaults.id, {
      id: promotedKeyItemId(vaults.id, caliburn),
      name: KeyItemName.parse('Caliburn'),
      base: { item: ReviewedRuneId.parse(line), name: ReviewedName.parse('Longsword') },
      runes: rules,
      notes: KeyItemNotes.parse(''),
      holder: mordred,
      createdAt: Temporal.Instant.from('2026-10-17T10:00:00Z'),
    });

    const retried = await service.promote(amiri, vaults.id, caliburn);

    expect(retried.keyItems).toHaveLength(1);
    expect(holders.linkOf(line)).toBe(promotedKeyItemId(vaults.id, caliburn));
  });

  test('a line that is already another key item is a 409', async () => {
    const other = KeyItemId.parse(newId());
    holders.hasLine(mordred, line, { keyItem: other });

    const refused = await rejection(service.promote(amiri, vaults.id, caliburn));

    expect(refused).toBeInstanceOf(ConflictError);
    expect(await keyItems.listForCampaign(vaults.id)).toHaveLength(0);
  });

  test('a review list gone stale is a 404: the line is gone or no longer breaks the rule', async () => {
    const wrongRule = { ...caliburn, rule: ItemRule.Hands };
    const gone = { ...caliburn, item: ReviewedItemId.parse(newId()) };

    const unflagged = await rejection(service.promote(amiri, vaults.id, wrongRule));
    const missing = await rejection(service.promote(amiri, vaults.id, gone));
    flagged.flag(vaults.id, []);
    const fixed = await rejection(service.promote(amiri, vaults.id, caliburn));

    expect([unflagged, missing, fixed].every((error) => error instanceof NotFoundError)).toBe(true);
    expect(await keyItems.listForCampaign(vaults.id)).toHaveLength(0);
  });

  test('a player is refused with a 403 and nothing changes', async () => {
    const refused = await rejection(service.promote(ezren, vaults.id, caliburn));

    expect(refused).toBeInstanceOf(ForbiddenError);
    expect(holders.linkOf(line)).toBeUndefined();
  });
});
