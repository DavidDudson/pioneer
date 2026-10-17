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
import { CharacterId } from '@pioneer/campaign/domain';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { campaignRoutes } from './campaign-routes';
import {
  itemApprovalService,
  keyItemService,
  packService,
  ruleLimitService,
  variantService,
} from './testing/campaign-pack-fixtures';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const stranger = UserId.parse(newId());
const kyra = CharacterId.parse(newId());
const mordred = CharacterId.parse(newId());

function table(): AnyElysia {
  const clock = fixedClock('2026-10-17T10:00:00Z');
  const campaigns = new InMemoryCampaignRepository();
  const directory = new InMemoryMemberDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren');
  const inviteRepository = new InMemoryCampaignInviteRepository();
  const party = new InMemoryCampaignPartyRepository(campaigns);
  const characters = new InMemoryCharacterDirectory()
    .character({ id: kyra, ownerId: ezren, name: 'Kyra' })
    .character({ id: mordred, ownerId: ezren, name: 'Mordred' });
  const services = {
    campaigns: new CampaignService({ campaigns, invites: inviteRepository, directory }, clock),
    invites: new CampaignInviteService(campaigns, inviteRepository, clock),
    party: new CampaignPartyService({ campaigns, party, characters, directory }, clock),
    packs: packService(campaigns, clock),
    variants: variantService(campaigns, clock),
    ruleLimits: ruleLimitService(campaigns, clock),
    itemApprovals: itemApprovalService(campaigns, clock),
    keyItems: keyItemService(campaigns, clock, { party, characters }),
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

interface KeyItemsJson {
  readonly manageable: boolean;
  readonly keyItems: readonly {
    readonly id: string;
    readonly name: string;
    readonly holder?: string;
    readonly runes: { readonly property: readonly unknown[] };
  }[];
}

async function json<TBody>(response: Response): Promise<TBody> {
  return (await response.json()) as TBody;
}

async function statusOf(handler: AnyElysia, call: Request): Promise<number> {
  const response = await handler.handle(call);
  return response.status;
}

const PROPERTY_RUNES = ['Flaming', 'Frost', 'Shock', 'Corrosive', 'Ghost Touch', 'Grievous'];

const caliburn = {
  name: 'Caliburn',
  base: { item: newId(), name: 'Longsword' },
  runes: { potency: 3, property: PROPERTY_RUNES.map((name) => ({ rune: newId(), name })) },
  notes: 'Drawn from the stone.',
};

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

async function createdIn(handler: AnyElysia, id: string): Promise<string> {
  const response = await handler.handle(request('POST', `/campaigns/${id}/key-items`, { as: amiri, body: caliburn }));
  const list = await json<KeyItemsJson>(response);
  return list.keyItems.map((each) => each.id).join(',');
}

describe('key item routes', () => {
  test('the GM creates Caliburn runes and all; a player reads it', async () => {
    const handler = table();
    const id = await campaign(handler);

    await createdIn(handler, id);
    const seen = await json<KeyItemsJson>(
      await handler.handle(request('GET', `/campaigns/${id}/key-items`, { as: ezren })),
    );

    expect(seen.manageable).toBe(false);
    expect(seen.keyItems.map((each) => each.name)).toStrictEqual(['Caliburn']);
    expect(seen.keyItems.map((each) => each.runes.property.length)).toStrictEqual([PROPERTY_RUNES.length]);
  });

  test('the GM gives, transfers, takes back and archives it', async () => {
    const handler = table();
    const id = await campaign(handler);
    const keyItem = await createdIn(handler, id);
    const holder = `/campaigns/${id}/key-items/${keyItem}/holder`;

    const given = await json<KeyItemsJson>(
      await handler.handle(request('POST', holder, { as: amiri, body: { characterId: kyra } })),
    );
    const moved = await json<KeyItemsJson>(
      await handler.handle(request('POST', holder, { as: amiri, body: { characterId: mordred } })),
    );
    const back = await json<KeyItemsJson>(await handler.handle(request('DELETE', holder, { as: amiri })));
    const archived = await json<KeyItemsJson>(
      await handler.handle(request('POST', `/campaigns/${id}/key-items/${keyItem}/archive`, { as: amiri })),
    );

    expect(given.keyItems.map((each) => each.holder)).toStrictEqual([kyra]);
    expect(moved.keyItems.map((each) => each.holder)).toStrictEqual([mordred]);
    expect(back.keyItems.map((each) => each.holder)).toStrictEqual([undefined]);
    expect(archived.keyItems).toStrictEqual([]);
  });

  test('a player gets a 403, a non-member a 404 and no user a 401', async () => {
    const handler = table();
    const id = await campaign(handler);
    const keyItem = await createdIn(handler, id);
    const path = `/campaigns/${id}/key-items`;
    const holder = `${path}/${keyItem}/holder`;

    const statuses = await Promise.all(
      [
        request('POST', path, { as: ezren, body: caliburn }),
        request('POST', holder, { as: ezren, body: { characterId: kyra } }),
        request('DELETE', holder, { as: ezren }),
        request('POST', `${path}/${keyItem}/archive`, { as: ezren }),
        request('GET', path, { as: stranger }),
        request('POST', path, { as: stranger, body: caliburn }),
        new Request(`http://localhost${path}`),
      ].map(async (each) => statusOf(handler, each)),
    );

    expect(statuses).toStrictEqual([403, 403, 403, 403, 404, 404, 401]);
  });

  test('a character outside the party is a 404, a name that is empty a 422', async () => {
    const handler = table();
    const id = await campaign(handler);
    const keyItem = await createdIn(handler, id);
    const path = `/campaigns/${id}/key-items`;

    const statuses = await Promise.all(
      [
        request('POST', `${path}/${keyItem}/holder`, { as: amiri, body: { characterId: newId() } }),
        request('POST', `${path}/${newId()}/holder`, { as: amiri, body: { characterId: kyra } }),
        request('POST', path, { as: amiri, body: { ...caliburn, name: '  ' } }),
      ].map(async (each) => statusOf(handler, each)),
    );

    expect(statuses).toStrictEqual([404, 404, 422]);
  });
});
