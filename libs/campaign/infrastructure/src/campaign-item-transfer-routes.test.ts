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
  InMemoryTransferLines,
} from '@pioneer/campaign/application';
import { CharacterId, ReviewedItemId } from '@pioneer/campaign/domain';
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
const kyra = CharacterId.parse(newId());
const mordred = CharacterId.parse(newId());
const longsword = ReviewedItemId.parse(newId());
const caliburn = ReviewedItemId.parse(newId());

function table(): AnyElysia {
  const clock = fixedClock('2026-10-17T10:00:00Z');
  const campaigns = new InMemoryCampaignRepository();
  const directory = new InMemoryMemberDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren');
  const inviteRepository = new InMemoryCampaignInviteRepository();
  const party = new InMemoryCampaignPartyRepository(campaigns);
  const characters = new InMemoryCharacterDirectory()
    .character({ id: kyra, ownerId: ezren, name: 'Kyra' })
    .character({ id: mordred, ownerId: ezren, name: 'Mordred' });
  const lines = new InMemoryTransferLines().hasLine(kyra, longsword).hasLine(kyra, caliburn, { keyItem: true });
  const services = {
    campaigns: new CampaignService({ campaigns, invites: inviteRepository, directory }, clock),
    invites: new CampaignInviteService(campaigns, inviteRepository, clock),
    party: new CampaignPartyService({ campaigns, party, characters, directory }, clock),
    packs: packService(campaigns, clock),
    variants: variantService(campaigns, clock),
    ruleLimits: ruleLimitService(campaigns, clock),
    itemApprovals: itemApprovalService(campaigns, clock),
    keyItems: keyItemService(campaigns, clock),
    itemTransfers: itemTransferService(campaigns, clock, { party, characters, lines }),
  };
  return new Elysia().use(problemHandler).use(campaignRoutes(services, new FakeAuthenticator()));
}

interface RequestOptions {
  readonly as?: UserId;
  readonly body?: unknown;
}

function request(method: string, path: string, { as, body }: RequestOptions): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(as === undefined ? {} : actingAs(as)) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function json<Json>(response: Response): Promise<Json> {
  return (await response.json()) as Json;
}

/** A campaign run by Amiri with Ezren as a player, whose Kyra and Mordred are in the party. */
async function campaign(handler: AnyElysia): Promise<string> {
  const created = await handler.handle(
    request('POST', '/campaigns', { as: amiri, body: { name: 'Abomination Vaults' } }),
  );
  const { id } = await json<{ readonly id: string }>(created);
  const issued = await handler.handle(request('POST', `/campaigns/${id}/invites`, { as: amiri }));
  const { token } = await json<{ readonly token: string }>(issued);
  await handler.handle(request('POST', '/campaigns/join', { as: ezren, body: { token } }));
  await Promise.all(
    [kyra, mordred].map(async (characterId) =>
      handler.handle(request('POST', `/campaigns/${id}/characters`, { as: ezren, body: { characterId } })),
    ),
  );
  return id;
}

describe('item transfer routes', () => {
  test('a player offers a line of their character to another, and it comes back pending', async () => {
    const handler = table();
    const id = await campaign(handler);

    const response = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/items`, {
        as: ezren,
        body: { from: kyra, to: mordred, item: longsword },
      }),
    );

    expect(response.status).toBe(200);
    expect(await json<object>(response)).toMatchObject({ from: kyra, to: mordred, item: longsword, status: 'pending' });
  });

  test('a signed-out caller gets 401, a stranger to the campaign 404, and a key item 409', async () => {
    const handler = table();
    const id = await campaign(handler);
    const body = { from: kyra, to: mordred, item: longsword };

    const anonymous = await handler.handle(request('POST', `/campaigns/${id}/transfers/items`, { body }));
    const outsider = UserId.parse(newId());
    const stranger = await handler.handle(request('POST', `/campaigns/${id}/transfers/items`, { as: outsider, body }));
    const key = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/items`, {
        as: ezren,
        body: { from: kyra, to: mordred, item: caliburn },
      }),
    );

    expect([anonymous.status, stranger.status, key.status]).toStrictEqual([401, 404, 409]);
  });

  test('a body that is not an offer is refused', async () => {
    const handler = table();
    const id = await campaign(handler);

    const response = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/items`, { as: ezren, body: { from: kyra } }),
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });
});
