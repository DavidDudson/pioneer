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
  InMemoryPartyStashKeeper,
} from '@pioneer/campaign/application';
import { CharacterId, PartyStashQuantity, ReviewedItemId, ReviewedName } from '@pioneer/campaign/domain';
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
  partyStashService,
  ruleLimitService,
  variantService,
} from './testing/campaign-pack-fixtures';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const stranger = UserId.parse(newId());
const kyra = CharacterId.parse(newId());
const rope = {
  id: ReviewedItemId.parse(newId()),
  name: ReviewedName.parse('Rope'),
  quantity: PartyStashQuantity.parse(1),
};

function table(): AnyElysia {
  const clock = fixedClock('2026-10-17T10:00:00Z');
  const campaigns = new InMemoryCampaignRepository();
  const directory = new InMemoryMemberDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren');
  const inviteRepository = new InMemoryCampaignInviteRepository();
  const party = new InMemoryCampaignPartyRepository(campaigns);
  const characters = new InMemoryCharacterDirectory().character({ id: kyra, ownerId: ezren, name: 'Kyra' });
  const services = {
    campaigns: new CampaignService({ campaigns, invites: inviteRepository, directory }, clock),
    invites: new CampaignInviteService(campaigns, inviteRepository, clock),
    party: new CampaignPartyService({ campaigns, party, characters, directory }, clock),
    packs: packService(campaigns, clock),
    variants: variantService(campaigns, clock),
    ruleLimits: ruleLimitService(campaigns, clock),
    itemApprovals: itemApprovalService(campaigns, clock),
    keyItems: keyItemService(campaigns, clock, { party, characters }),
    itemTransfers: itemTransferService(campaigns, clock, { party, characters }),
    partyStash: partyStashService(campaigns, {
      party,
      characters,
      stash: new InMemoryPartyStashKeeper().stashHolds(rope),
    }),
  };
  return new Elysia().use(problemHandler).use(campaignRoutes(services, new FakeAuthenticator()));
}

interface RequestOptions {
  readonly as?: UserId;
  readonly body?: unknown;
}

function request(method: string, path: string, { as, body }: RequestOptions = {}): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(as === undefined ? {} : actingAs(as)) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** A campaign run by Amiri that Ezren has joined. */
async function campaign(handler: AnyElysia): Promise<string> {
  const created = await handler.handle(
    request('POST', '/campaigns', { as: amiri, body: { name: 'Abomination Vaults' } }),
  );
  const { id } = (await created.json()) as { readonly id: string };
  const issued = await handler.handle(request('POST', `/campaigns/${id}/invites`, { as: amiri }));
  const { token } = (await issued.json()) as { readonly token: string };
  await handler.handle(request('POST', '/campaigns/join', { as: ezren, body: { token } }));
  return id;
}

describe('party stash routes', () => {
  test('a signed-out request is a 401', async () => {
    const handler = table();
    const id = await campaign(handler);

    const response = await handler.handle(request('GET', `/campaigns/${id}/party-stash`));

    expect(response.status).toBe(401);
  });

  test('every member reads the stash, and someone outside the campaign gets a 404', async () => {
    const handler = table();
    const id = await campaign(handler);

    const member = await handler.handle(request('GET', `/campaigns/${id}/party-stash`, { as: ezren }));
    const outsider = await handler.handle(request('GET', `/campaigns/${id}/party-stash`, { as: stranger }));

    expect(member.status).toBe(200);
    expect(await member.json()).toStrictEqual({
      lines: [{ id: rope.id, name: 'Rope', quantity: 1 }],
      characters: [],
    });
    expect(outsider.status).toBe(404);
  });

  test('a character outside the party can neither deposit nor take (404)', async () => {
    const handler = table();
    const id = await campaign(handler);

    const deposit = await handler.handle(
      request('POST', `/campaigns/${id}/party-stash/deposit`, { as: ezren, body: { from: kyra, item: rope.id } }),
    );
    const take = await handler.handle(
      request('POST', `/campaigns/${id}/party-stash/take`, { as: ezren, body: { to: kyra, item: rope.id } }),
    );

    expect([deposit.status, take.status]).toStrictEqual([404, 404]);
  });
});
