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
import type { Problem } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { campaignRoutes } from './campaign-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const seelah = UserId.parse(newId());
const stranger = UserId.parse(newId());

const valeros = newId();
const merisiel = newId();
const kyra = newId();

function app(): AnyElysia {
  const clock = fixedClock('2026-10-10T10:00:00Z');
  const campaigns = new InMemoryCampaignRepository();
  const directory = new InMemoryMemberDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren').name(seelah, 'Seelah');
  const characters = new InMemoryCharacterDirectory()
    .character({ id: valeros, ownerId: ezren, name: 'Valeros', level: 3 })
    .character({ id: merisiel, ownerId: ezren, name: 'Merisiel' })
    .character({ id: kyra, ownerId: seelah, name: 'Kyra' });
  const inviteRepository = new InMemoryCampaignInviteRepository();
  const service = new CampaignService({ campaigns, invites: inviteRepository, directory }, clock);
  const invites = new CampaignInviteService(campaigns, inviteRepository, clock);
  const party = new CampaignPartyService(
    { campaigns, party: new InMemoryCampaignPartyRepository(), characters, directory },
    clock,
  );
  return new Elysia()
    .use(problemHandler)
    .use(campaignRoutes({ campaigns: service, invites, party }, new FakeAuthenticator()));
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

interface CharacterJson {
  readonly characterId: string;
  readonly name: string;
  readonly level: number;
}

interface PartyCharacterJson extends CharacterJson {
  readonly ownerId: string;
  readonly ownerName: string;
  readonly attachedAt: string;
  readonly detachable: boolean;
}

interface PartyJson {
  readonly characters: readonly PartyCharacterJson[];
  readonly attachable: readonly CharacterJson[];
}

interface RosterJson {
  readonly members: readonly { readonly id: string; readonly userId: string }[];
}

async function json<TBody>(response: Response): Promise<TBody> {
  return (await response.json()) as TBody;
}

/** A campaign run by Amiri with Ezren and Seelah as players; its id. */
async function campaign(api: AnyElysia, name = 'Abomination Vaults'): Promise<string> {
  const created = await api.handle(request('POST', '/campaigns', { as: amiri, body: { name } }));
  const { id } = await json<{ readonly id: string }>(created);
  const issued = await api.handle(request('POST', `/campaigns/${id}/invites`, { as: amiri }));
  const { token } = await json<{ readonly token: string }>(issued);
  await api.handle(request('POST', '/campaigns/join', { as: ezren, body: { token } }));
  await api.handle(request('POST', '/campaigns/join', { as: seelah, body: { token } }));
  return id;
}

/** Who attaches which character. */
interface Attaching {
  readonly as: UserId;
  readonly characterId: string;
}

async function attach(api: AnyElysia, id: string, { as, characterId }: Attaching): Promise<Response> {
  return api.handle(request('POST', `/campaigns/${id}/characters`, { as, body: { characterId } }));
}

describe('party routes', () => {
  test('a player attaches their character; everyone in the campaign sees it', async () => {
    const api = app();
    const id = await campaign(api);
    const attached = await attach(api, id, { as: ezren, characterId: valeros });
    expect(attached.status).toBe(200);
    const party = await json<PartyJson>(attached);
    expect(party).toStrictEqual({
      characters: [
        {
          characterId: valeros,
          name: 'Valeros',
          level: 3,
          ownerId: ezren,
          ownerName: 'Ezren',
          attachedAt: '2026-10-10T10:00:00.000Z',
          detachable: true,
        },
      ],
      attachable: [{ characterId: merisiel, name: 'Merisiel', level: 1 }],
    });

    const asSeelah = await json<PartyJson>(await api.handle(request('GET', `/campaigns/${id}/party`, { as: seelah })));
    expect(asSeelah.characters.map((character) => [character.name, character.detachable])).toStrictEqual([
      ['Valeros', false],
    ]);
    expect(asSeelah.attachable.map((character) => character.name)).toStrictEqual(['Kyra']);
  });

  test('another user’s character is a 404, and a malformed id a 422', async () => {
    const api = app();
    const id = await campaign(api);
    const theirs = await attach(api, id, { as: ezren, characterId: kyra });
    expect(theirs.status).toBe(404);
    const byGm = await attach(api, id, { as: amiri, characterId: valeros });
    expect(byGm.status).toBe(404);
    const malformed = await attach(api, id, { as: ezren, characterId: 'nope' });
    expect(malformed.status).toBe(422);
    const detach = await api.handle(request('DELETE', `/campaigns/${id}/characters/nope`, { as: ezren }));
    expect(detach.status).toBe(422);
  });

  test('a character already in another campaign is a 409 that says why', async () => {
    const api = app();
    const vaults = await campaign(api);
    const kingmaker = await campaign(api, 'Kingmaker');
    await attach(api, kingmaker, { as: ezren, characterId: valeros });
    const response = await attach(api, vaults, { as: ezren, characterId: valeros });
    expect(response.status).toBe(409);
    const problem = await json<Problem>(response);
    expect(problem.type).toBe('conflict');
    expect(problem.message).toStrictEqual({ key: 'campaign.party.inOtherCampaign' });
  });

  test('the owner and the GM detach; another player gets a 403 and a stranger a 404', async () => {
    const api = app();
    const id = await campaign(api);
    await attach(api, id, { as: ezren, characterId: valeros });
    await attach(api, id, { as: seelah, characterId: kyra });

    const byPlayer = await api.handle(request('DELETE', `/campaigns/${id}/characters/${valeros}`, { as: seelah }));
    expect(byPlayer.status).toBe(403);
    const byStranger = await api.handle(request('DELETE', `/campaigns/${id}/characters/${valeros}`, { as: stranger }));
    expect(byStranger.status).toBe(404);
    const unseen = await api.handle(request('GET', `/campaigns/${id}/party`, { as: stranger }));
    expect(unseen.status).toBe(404);

    const byOwner = await api.handle(request('DELETE', `/campaigns/${id}/characters/${valeros}`, { as: ezren }));
    expect(byOwner.status).toBe(200);
    const byGm = await api.handle(request('DELETE', `/campaigns/${id}/characters/${kyra}`, { as: amiri }));
    expect(byGm.status).toBe(200);
    const emptied = await json<PartyJson>(byGm);
    expect(emptied.characters).toStrictEqual([]);
  });

  test('a removed player’s characters leave the party with them', async () => {
    const api = app();
    const id = await campaign(api);
    await attach(api, id, { as: ezren, characterId: valeros });
    await attach(api, id, { as: seelah, characterId: kyra });
    const roster = await json<RosterJson>(await api.handle(request('GET', `/campaigns/${id}/members`, { as: amiri })));
    const ezrenMember = roster.members.find((member) => member.userId === ezren)?.id;
    await api.handle(request('DELETE', `/campaigns/${id}/members/${ezrenMember}`, { as: amiri }));

    const party = await json<PartyJson>(await api.handle(request('GET', `/campaigns/${id}/party`, { as: amiri })));
    expect(party.characters.map((character) => character.name)).toStrictEqual(['Kyra']);
  });
});
