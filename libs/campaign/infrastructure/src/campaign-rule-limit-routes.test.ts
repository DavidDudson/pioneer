import { describe, expect, test } from 'bun:test';

import {
  CampaignInviteService,
  CampaignPartyService,
  CampaignService,
  InMemoryCampaignInviteRepository,
  InMemoryCampaignPartyRepository,
  InMemoryCampaignRepository,
  InMemoryCharacterDirectory,
  InMemoryMemberDirectory,
} from '@pioneer/campaign/application';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { campaignRoutes } from './campaign-routes';
import {
  itemApprovalService,
  itemTransferService,
  keyItemService,
  packService,
  ruleLimitService,
  variantService,
} from './testing/campaign-pack-fixtures';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const stranger = UserId.parse(newId());

function app(): AnyElysia {
  const clock = fixedClock('2026-10-17T10:00:00Z');
  const campaigns = new InMemoryCampaignRepository();
  const directory = new InMemoryMemberDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren');
  const inviteRepository = new InMemoryCampaignInviteRepository();
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
    itemApprovals: itemApprovalService(campaigns, clock),
    keyItems: keyItemService(campaigns, clock),
    itemTransfers: itemTransferService(campaigns, clock),
  };
  return new Elysia().use(problemHandler).use(campaignRoutes(services, new FakeAuthenticator()));
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

interface RuleLimitsJson {
  readonly manageable: boolean;
  readonly limits: readonly { readonly limit: string; readonly value: number; readonly custom: boolean }[];
}

/** The status `handler` answers `call` with. */
async function statusOf(handler: AnyElysia, call: Request): Promise<number> {
  const response = await handler.handle(call);
  return response.status;
}

async function json<TBody>(response: Response): Promise<TBody> {
  return (await response.json()) as TBody;
}

/** A campaign run by Amiri with Ezren as a player; its id. */
async function campaign(handler: AnyElysia): Promise<string> {
  const created = await handler.handle(
    request('POST', '/campaigns', { as: amiri, body: { name: 'Abomination Vaults' } }),
  );
  const { id } = await json<{ readonly id: string }>(created);
  const issued = await handler.handle(request('POST', `/campaigns/${id}/invites`, { as: amiri }));
  const { token } = await json<{ readonly token: string }>(issued);
  await handler.handle(request('POST', '/campaigns/join', { as: ezren, body: { token } }));
  return id;
}

function invested(limits: RuleLimitsJson): number | undefined {
  return limits.limits.find(({ limit }) => limit === 'investedMax')?.value;
}

describe('rule limit routes', () => {
  test('the GM sets a limit and resets it; a player sees it', async () => {
    const handler = app();
    const id = await campaign(handler);
    const set = await handler.handle(
      request('POST', `/campaigns/${id}/rule-limits/investedMax`, { as: amiri, body: { value: 12 } }),
    );
    expect(set.status).toBe(200);
    expect(invested(await json<RuleLimitsJson>(set))).toBe(12);

    const seen = await json<RuleLimitsJson>(
      await handler.handle(request('GET', `/campaigns/${id}/rule-limits`, { as: ezren })),
    );
    expect([seen.manageable, invested(seen)]).toStrictEqual([false, 12]);

    const reset = await handler.handle(request('DELETE', `/campaigns/${id}/rule-limits/investedMax`, { as: amiri }));
    expect(invested(await json<RuleLimitsJson>(reset))).toBe(10);
  });

  test('a player gets a 403, a non-member a 404 and no user a 401', async () => {
    const handler = app();
    const id = await campaign(handler);
    const body = { value: 12 };
    const path = `/campaigns/${id}/rule-limits/investedMax`;
    const statuses = await Promise.all(
      [
        request('POST', path, { as: ezren, body }),
        request('DELETE', path, { as: ezren }),
        request('GET', `/campaigns/${id}/rule-limits`, { as: stranger }),
        request('POST', path, { as: stranger, body }),
        new Request(`http://localhost/campaigns/${id}/rule-limits`),
      ].map(async (each) => statusOf(handler, each)),
    );
    expect(statuses).toStrictEqual([403, 403, 404, 404, 401]);
  });

  test('a number past the ceiling, zero, or an unknown limit is a 422', async () => {
    const handler = app();
    const id = await campaign(handler);
    const statuses = await Promise.all(
      [
        ['investedMax', 101],
        ['investedMax', 0],
        ['spoons', 3],
      ].map(async ([limit, value]) =>
        statusOf(handler, request('POST', `/campaigns/${id}/rule-limits/${limit}`, { as: amiri, body: { value } })),
      ),
    );
    expect(statuses).toStrictEqual([422, 422, 422]);
  });
});
