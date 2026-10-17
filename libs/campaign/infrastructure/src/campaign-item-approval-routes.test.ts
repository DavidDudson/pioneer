import { describe, expect, test } from 'bun:test';

import {
  CampaignInviteService,
  CampaignPartyService,
  CampaignService,
  InMemoryCampaignInviteRepository,
  InMemoryCampaignPartyRepository,
  InMemoryCampaignRepository,
  InMemoryCharacterDirectory,
  InMemoryFlaggedItems,
  InMemoryMemberDirectory,
} from '@pioneer/campaign/application';
import {
  CampaignId,
  CharacterId,
  FlaggedItem,
  ItemRule,
  ReviewedCount,
  ReviewedItemId,
} from '@pioneer/campaign/domain';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { campaignRoutes } from './campaign-routes';
import { itemApprovalService, packService, ruleLimitService, variantService } from './testing/campaign-pack-fixtures';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const stranger = UserId.parse(newId());
const kyra = CharacterId.parse(newId());
const caliburn = ReviewedItemId.parse(newId());

interface Table {
  readonly handler: AnyElysia;
  readonly flagged: InMemoryFlaggedItems;
}

function table(): Table {
  const clock = fixedClock('2026-10-17T10:00:00Z');
  const campaigns = new InMemoryCampaignRepository();
  const directory = new InMemoryMemberDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren');
  const inviteRepository = new InMemoryCampaignInviteRepository();
  const flagged = new InMemoryFlaggedItems();
  const services = {
    campaigns: new CampaignService({ campaigns, invites: inviteRepository, directory }, clock),
    invites: new CampaignInviteService(campaigns, inviteRepository, clock),
    party: new CampaignPartyService(
      {
        campaigns,
        party: new InMemoryCampaignPartyRepository(campaigns),
        characters: new InMemoryCharacterDirectory(),
        directory,
      },
      clock,
    ),
    packs: packService(campaigns, clock),
    variants: variantService(campaigns, clock),
    ruleLimits: ruleLimitService(campaigns, clock),
    itemApprovals: itemApprovalService(campaigns, clock, flagged),
  };
  return { handler: new Elysia().use(problemHandler).use(campaignRoutes(services, new FakeAuthenticator())), flagged };
}

interface RequestOptions {
  readonly as: UserId;
  readonly body?: unknown;
}

function request(method: string, path: string, { as, body }: RequestOptions): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...actingAs(as) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

interface Approved {
  readonly item: string;
  readonly approval: string;
  readonly approvedCount: number;
}

interface ReviewJson {
  readonly manageable: boolean;
  readonly needsReview: readonly { readonly item: string; readonly rule: string }[];
  readonly approved: readonly Approved[];
}

async function statusOf(handler: AnyElysia, call: Request): Promise<number> {
  const response = await handler.handle(call);
  return response.status;
}

async function json<TBody>(response: Response): Promise<TBody> {
  return (await response.json()) as TBody;
}

/** A campaign run by Amiri with Ezren as a player, whose party has Kyra's Caliburn with seven property runes. */
async function campaign({ handler, flagged }: Table): Promise<string> {
  const created = await handler.handle(
    request('POST', '/campaigns', { as: amiri, body: { name: 'Abomination Vaults' } }),
  );
  const { id } = await json<{ readonly id: string }>(created);
  const issued = await handler.handle(request('POST', `/campaigns/${id}/invites`, { as: amiri }));
  const { token } = await json<{ readonly token: string }>(issued);
  await handler.handle(request('POST', '/campaigns/join', { as: ezren, body: { token } }));
  flagged.flag(CampaignId.parse(id), [
    FlaggedItem.parse({
      character: kyra,
      characterName: 'Kyra',
      item: caliburn,
      itemName: 'Caliburn',
      rule: ItemRule.PropertyRunes,
      count: ReviewedCount.parse(7),
    }),
  ]);
  return id;
}

const approving = { character: kyra, item: caliburn, rule: ItemRule.PropertyRunes };

describe('item approval routes', () => {
  test('the GM sees what needs review, approves it, and revokes it; a player sees the approved item', async () => {
    const { handler, flagged } = table();
    const id = await campaign({ handler, flagged });
    const before = await json<ReviewJson>(
      await handler.handle(request('GET', `/campaigns/${id}/item-approvals`, { as: amiri })),
    );
    expect(before.needsReview.map(({ item }) => item)).toStrictEqual([caliburn]);

    const approved = await handler.handle(
      request('POST', `/campaigns/${id}/item-approvals`, { as: amiri, body: approving }),
    );
    expect(approved.status).toBe(200);
    const review = await json<ReviewJson>(approved);
    expect([review.needsReview, review.approved.map(({ approvedCount }) => approvedCount)]).toStrictEqual([[], [7]]);

    const seen = await json<ReviewJson>(
      await handler.handle(request('GET', `/campaigns/${id}/item-approvals`, { as: ezren })),
    );
    expect([seen.manageable, seen.needsReview, seen.approved.map(({ item }) => item)]).toStrictEqual([
      false,
      [],
      [caliburn],
    ]);

    const approval = review.approved.map((each) => each.approval).join(',');
    const revoked = await handler.handle(
      request('DELETE', `/campaigns/${id}/item-approvals/${approval}`, { as: amiri }),
    );
    const after = await json<ReviewJson>(revoked);
    expect(after.needsReview.map(({ item }) => item)).toStrictEqual([caliburn]);
  });

  test('a player gets a 403, a non-member a 404 and no user a 401', async () => {
    const { handler, flagged } = table();
    const id = await campaign({ handler, flagged });
    const path = `/campaigns/${id}/item-approvals`;
    const revoking = `${path}/${newId()}`;
    const statuses = await Promise.all(
      [
        request('POST', path, { as: ezren, body: approving }),
        request('DELETE', revoking, { as: ezren }),
        request('GET', path, { as: stranger }),
        request('POST', path, { as: stranger, body: approving }),
        new Request(`http://localhost${path}`),
      ].map(async (each) => statusOf(handler, each)),
    );
    expect(statuses).toStrictEqual([403, 403, 404, 404, 401]);
  });

  test('approving an item that is not flagged is a 404, and a rule that is not one is a 422', async () => {
    const { handler, flagged } = table();
    const id = await campaign({ handler, flagged });
    const path = `/campaigns/${id}/item-approvals`;
    const statuses = await Promise.all(
      [
        { ...approving, item: newId() },
        { ...approving, rule: ItemRule.Hands },
        { ...approving, rule: 'spoons' },
      ].map(async (body) => statusOf(handler, request('POST', path, { as: amiri, body }))),
    );
    expect(statuses).toStrictEqual([404, 404, 422]);
  });
});
