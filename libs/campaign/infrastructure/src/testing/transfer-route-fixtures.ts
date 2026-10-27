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
import * as z from 'zod';

import { campaignRoutes } from '../campaign-routes';
import {
  itemApprovalService,
  itemTransferService,
  keyItemService,
  packService,
  ruleLimitService,
  variantService,
} from './campaign-pack-fixtures';

export const amiri = UserId.parse(newId());
export const ezren = UserId.parse(newId());
export const kyra = CharacterId.parse(newId());
export const mordred = CharacterId.parse(newId());
export const longsword = ReviewedItemId.parse(newId());
export const caliburn = ReviewedItemId.parse(newId());

export function table(): AnyElysia {
  const clock = fixedClock('2026-10-17T10:00:00Z');
  const campaigns = new InMemoryCampaignRepository();
  const directory = new InMemoryMemberDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren');
  const inviteRepository = new InMemoryCampaignInviteRepository();
  const party = new InMemoryCampaignPartyRepository(campaigns);
  const characters = new InMemoryCharacterDirectory()
    .character({ id: kyra, ownerId: ezren, name: 'Kyra' })
    .character({ id: mordred, ownerId: ezren, name: 'Mordred' });
  const lines = new InMemoryTransferLines()
    .hasLine(kyra, longsword)
    .hasLine(kyra, caliburn, { keyItem: true })
    .hasCoins(kyra, { gp: 10 });
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

export interface RequestOptions {
  readonly as?: UserId;
  readonly body?: unknown;
}

export function request(method: string, path: string, { as, body }: RequestOptions): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(as === undefined ? {} : actingAs(as)) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export async function json<Output>(response: Response, schema: z.ZodType<Output>): Promise<Output> {
  return schema.parse(await response.json());
}

/** A campaign run by Amiri with Ezren as a player, whose Kyra and Mordred are in the party. */
export async function campaign(handler: AnyElysia): Promise<string> {
  const created = await handler.handle(
    request('POST', '/campaigns', { as: amiri, body: { name: 'Abomination Vaults' } }),
  );
  const { id } = await json(created, z.object({ id: z.string() }));
  const issued = await handler.handle(request('POST', `/campaigns/${id}/invites`, { as: amiri }));
  const { token } = await json(issued, z.object({ token: z.string() }));
  await handler.handle(request('POST', '/campaigns/join', { as: ezren, body: { token } }));
  await Promise.all(
    [kyra, mordred].map(async (characterId) =>
      handler.handle(request('POST', `/campaigns/${id}/characters`, { as: ezren, body: { characterId } })),
    ),
  );
  return id;
}

export const Answer = z.object({ id: z.string(), status: z.string() });

/** Ezren offers Kyra's longsword to Mordred, whom he also owns, and gets the offer's id. */
export async function offered(handler: AnyElysia, id: string): Promise<string> {
  const response = await handler.handle(
    request('POST', `/campaigns/${id}/transfers/items`, {
      as: ezren,
      body: { from: kyra, to: mordred, item: longsword },
    }),
  );
  const offer = await json(response, Answer);
  return offer.id;
}
