import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CampaignItemApprovalId,
  CharacterId,
  ItemRule,
  ReviewedItemId,
  ReviewedRuneId,
} from '@pioneer/campaign/domain';
import type { ApproveItemBody, Campaign, FlaggedItem } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { fixedClock, ForbiddenError, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CampaignItemApprovalService } from './campaign-item-approval-service';
import { flag, withRune } from './campaign-item-approval-testing';
import type { Broken } from './campaign-item-approval-testing';
import { InMemoryCampaignItemApprovalRepository } from './in-memory-campaign-item-approval-repository';
import { InMemoryCampaignRepository } from './in-memory-campaign-repository';
import { InMemoryFlaggedItems } from './in-memory-flagged-items';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const stranger = UserId.parse(newId());
const kyra = CharacterId.parse(newId());
const caliburn = ReviewedItemId.parse(newId());
const longsword = ReviewedItemId.parse(newId());

const line = (item: ReviewedItemId, rule: ItemRule): Broken => ({ character: kyra, item, rule });
const runes = (item: ReviewedItemId, count: number): FlaggedItem => flag(line(item, ItemRule.PropertyRunes), count);
const target = (item: ReviewedItemId, rule: ItemRule): ApproveItemBody => ({ character: kyra, item, rule });

describe('CampaignItemApprovalService', () => {
  let campaigns: InMemoryCampaignRepository;
  let flagged: InMemoryFlaggedItems;
  let service: CampaignItemApprovalService;
  let vaults: Campaign;

  beforeEach(async () => {
    campaigns = new InMemoryCampaignRepository();
    flagged = new InMemoryFlaggedItems();
    service = new CampaignItemApprovalService(
      { campaigns, approvals: new InMemoryCampaignItemApprovalRepository(), flagged },
      fixedClock('2026-10-17T10:00:00Z'),
    );
    vaults = await campaigns.insert(new CampaignBuilder().ranBy(amiri).withPlayer(ezren).build());
    flagged.flag(vaults.id, [runes(caliburn, 7), flag(line(longsword, ItemRule.Invested), 11)]);
  });

  test('a flagged item that no one approved needs review, and only the GM sees that', async () => {
    const gm = await service.itemReview(amiri, vaults.id);
    expect(gm.manageable).toBe(true);
    expect(gm.needsReview.map(({ item, rule }) => [item, rule])).toStrictEqual([
      [caliburn, ItemRule.PropertyRunes],
      [longsword, ItemRule.Invested],
    ]);
    expect(gm.approved).toStrictEqual([]);
    const player = await service.itemReview(ezren, vaults.id);
    expect(player).toMatchObject({ manageable: false, needsReview: [], approved: [] });
  });

  test('the GM approves an item for the count it is flagged at; every member then sees it approved', async () => {
    const approved = await service.approve(amiri, vaults.id, target(caliburn, ItemRule.PropertyRunes));
    expect(approved.needsReview.map(({ item }) => item)).toStrictEqual([longsword]);
    expect(approved.approved).toMatchObject([{ item: caliburn, rule: ItemRule.PropertyRunes, approvedCount: 7 }]);
    const player = await service.itemReview(ezren, vaults.id);
    expect(player.approved.map(({ item }) => item)).toStrictEqual([caliburn]);
  });

  test('the warning comes back when the item breaks the rule by more than was approved', async () => {
    await service.approve(amiri, vaults.id, target(caliburn, ItemRule.PropertyRunes));
    flagged.flag(vaults.id, [runes(caliburn, 8)]);
    const grown = await service.itemReview(amiri, vaults.id);
    expect(grown.needsReview).toMatchObject([{ item: caliburn, count: 8 }]);
    expect(grown.approved).toStrictEqual([]);

    const again = await service.approve(amiri, vaults.id, target(caliburn, ItemRule.PropertyRunes));
    expect(again.needsReview).toStrictEqual([]);
    expect(again.approved).toMatchObject([{ approvedCount: 8 }]);
  });

  test('an item that shrinks stays approved, and one approval covers one rule only', async () => {
    await service.approve(amiri, vaults.id, target(caliburn, ItemRule.PropertyRunes));
    flagged.flag(vaults.id, [runes(caliburn, 6), flag(line(caliburn, ItemRule.Hands), 3)]);
    const review = await service.itemReview(amiri, vaults.id);
    expect(review.approved.map(({ rule }) => rule)).toStrictEqual([ItemRule.PropertyRunes]);
    expect(review.needsReview.map(({ rule }) => rule)).toStrictEqual([ItemRule.Hands]);
  });

  test('a rune not allowed is approved for that rune, not for the item', async () => {
    const flaming = ReviewedRuneId.parse(newId());
    const frost = ReviewedRuneId.parse(newId());
    const misfit = flag(line(caliburn, ItemRule.RuneNotAllowed), 1);
    flagged.flag(vaults.id, [withRune(misfit, flaming), withRune(misfit, frost)]);
    const review = await service.approve(amiri, vaults.id, {
      ...target(caliburn, ItemRule.RuneNotAllowed),
      rune: flaming,
    });
    expect(review.approved.map(({ rune }) => rune)).toStrictEqual([flaming]);
    expect(review.needsReview.map(({ rune }) => rune)).toStrictEqual([frost]);
  });

  test('revoking brings the item back to review, and revoking twice is harmless', async () => {
    const approved = await service.approve(amiri, vaults.id, target(caliburn, ItemRule.PropertyRunes));
    const approval = CampaignItemApprovalId.parse(approved.approved[0]?.approval);
    const revoked = await service.revoke(amiri, vaults.id, approval);
    expect(revoked.approved).toStrictEqual([]);
    expect(revoked.needsReview.map(({ item }) => item)).toContain(caliburn);
    expect(await service.revoke(amiri, vaults.id, approval)).toStrictEqual(revoked);
  });

  test('approving an item that is not flagged, or for a rule it does not break, is a 404', async () => {
    const missing = target(ReviewedItemId.parse(newId()), ItemRule.Hands);
    const hands = target(caliburn, ItemRule.Hands);
    const unflagged = await rejection(service.approve(amiri, vaults.id, missing));
    const otherRule = await rejection(service.approve(amiri, vaults.id, hands));
    expect(unflagged).toBeInstanceOf(NotFoundError);
    expect(otherRule).toBeInstanceOf(NotFoundError);
  });

  test('a player cannot approve or revoke: 403', async () => {
    const runesOfCaliburn = target(caliburn, ItemRule.PropertyRunes);
    const approval = CampaignItemApprovalId.parse(newId());
    const approve = await rejection(service.approve(ezren, vaults.id, runesOfCaliburn));
    const revoke = await rejection(service.revoke(ezren, vaults.id, approval));
    expect(approve).toBeInstanceOf(ForbiddenError);
    expect(revoke).toBeInstanceOf(ForbiddenError);
  });

  test('a non-member gets the 404 of a missing campaign', async () => {
    const read = await rejection(service.itemReview(stranger, vaults.id));
    const runesOfCaliburn = target(caliburn, ItemRule.PropertyRunes);
    const approve = await rejection(service.approve(stranger, vaults.id, runesOfCaliburn));
    expect(read).toBeInstanceOf(NotFoundError);
    expect(approve).toBeInstanceOf(NotFoundError);
  });
});
