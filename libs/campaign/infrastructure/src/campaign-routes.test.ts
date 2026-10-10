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

function app(): AnyElysia {
  const clock = fixedClock('2026-10-10T10:00:00Z');
  const campaigns = new InMemoryCampaignRepository();
  const inviteRepository = new InMemoryCampaignInviteRepository();
  const directory = new InMemoryMemberDirectory();
  const service = new CampaignService({ campaigns, invites: inviteRepository, directory }, clock);
  const invites = new CampaignInviteService(campaigns, inviteRepository, clock);
  const partyService = new CampaignPartyService(
    { campaigns, party: new InMemoryCampaignPartyRepository(), characters: new InMemoryCharacterDirectory(), directory },
    clock,
  );
  return new Elysia()
    .use(problemHandler)
    .use(campaignRoutes({ campaigns: service, invites, party: partyService }, new FakeAuthenticator()));
}

/** No signed-in user. */
const anonymous = Symbol('anonymous');

interface RequestOptions {
  /** The acting user; `anonymous` sends none. */
  readonly as?: UserId | typeof anonymous;
  readonly body?: unknown;
}

function request(method: string, path: string, { as = amiri, body }: RequestOptions = {}): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(as === anonymous ? {} : actingAs(as)) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** The part of a campaign response these tests read. */
interface CampaignJson {
  readonly id: string;
  readonly name: string;
  readonly gmId: string;
  readonly members: readonly { readonly userId: string; readonly role: string; readonly joinedAt: string }[];
}

async function create(api: AnyElysia, as: UserId, name: string): Promise<CampaignJson> {
  const response = await api.handle(request('POST', '/campaigns', { as, body: { name } }));
  return (await response.json()) as CampaignJson;
}

describe('campaign routes', () => {
  test('create, then get and list it', async () => {
    const api = app();
    const created = await api.handle(request('POST', '/campaigns', { body: { name: 'Abomination Vaults' } }));
    expect(created.status).toBe(200);
    const campaign = (await created.json()) as CampaignJson;
    expect(campaign.gmId).toBe(amiri);
    expect(campaign.members).toStrictEqual([
      expect.objectContaining({ userId: amiri, role: 'gm', joinedAt: '2026-10-10T10:00:00.000Z' }),
    ]);

    const got = await api.handle(request('GET', `/campaigns/${campaign.id}`));
    expect(((await got.json()) as CampaignJson).name).toBe('Abomination Vaults');
    const listed = await api.handle(request('GET', '/campaigns'));
    expect(((await listed.json()) as CampaignJson[]).map(({ id }) => id)).toStrictEqual([campaign.id]);
  });

  test('a blank name is 422', async () => {
    const response = await app().handle(request('POST', '/campaigns', { body: { name: '  ' } }));
    expect(response.status).toBe(422);
    const problem = (await response.json()) as Problem;
    expect(problem.message).toStrictEqual({ key: 'problem.validation' });
    expect(problem.issues).toContainEqual({
      path: ['name'],
      message: { key: 'validation.tooSmall', params: { origin: 'string', minimum: 1 } },
    });
  });

  test('a malformed id is 422', async () => {
    const response = await app().handle(request('GET', '/campaigns/not-a-uuid'));
    expect(response.status).toBe(422);
  });

  test('the list takes no query parameters', async () => {
    const response = await app().handle(request('GET', '/campaigns?sort=name'));
    expect(response.status).toBe(422);
  });
});

describe('campaign routes without a signed-in user', () => {
  const api = app();
  const id = newId();
  const cases: readonly (readonly [string, Request])[] = [
    ['list', request('GET', '/campaigns', { as: anonymous })],
    ['get', request('GET', `/campaigns/${id}`, { as: anonymous })],
    ['create', request('POST', '/campaigns', { as: anonymous, body: { name: 'Kingmaker' } })],
    ['roster', request('GET', `/campaigns/${id}/members`, { as: anonymous })],
    ['remove member', request('DELETE', `/campaigns/${id}/members/${newId()}`, { as: anonymous })],
    ['transfer GM', request('POST', `/campaigns/${id}/gm`, { as: anonymous, body: { memberId: newId() } })],
    ['leave', request('POST', `/campaigns/${id}/leave`, { as: anonymous })],
    ['party', request('GET', `/campaigns/${id}/party`, { as: anonymous })],
    ['attach character', request('POST', `/campaigns/${id}/characters`, { as: anonymous, body: { characterId: newId() } })],
    ['detach character', request('DELETE', `/campaigns/${id}/characters/${newId()}`, { as: anonymous })],
    ['invites', request('GET', `/campaigns/${id}/invites`, { as: anonymous })],
    ['create invite', request('POST', `/campaigns/${id}/invites`, { as: anonymous })],
    ['revoke invite', request('DELETE', `/campaigns/${id}/invites/${newId()}`, { as: anonymous })],
    ['join', request('POST', '/campaigns/join', { as: anonymous, body: { token: 'A'.repeat(43) } })],
    // Authentication comes before decoding: bad input never turns a 401 into a 422.
    ['get with a malformed id', request('GET', '/campaigns/not-a-uuid', { as: anonymous })],
    ['create with an empty body', request('POST', '/campaigns', { as: anonymous, body: {} })],
  ];

  test.each(cases)('%s is a 401 problem', async (_name, unsigned) => {
    const response = await api.handle(unsigned);
    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    const problem = (await response.json()) as Problem;
    expect(problem.type).toBe('unauthorized');
    expect(problem.message).toStrictEqual({ key: 'problem.unauthorized' });
  });
});

describe('campaign routes across users', () => {
  test('a campaign the user is not in is a 404 and absent from their list', async () => {
    const api = app();
    const theirs = await create(api, ezren, 'Kingmaker');
    const mine = await create(api, amiri, 'Abomination Vaults');

    const got = await api.handle(request('GET', `/campaigns/${theirs.id}`));
    expect(got.status).toBe(404);
    expect(((await got.json()) as Problem).message).toStrictEqual({ key: 'problem.notFound' });

    const missing = await api.handle(request('GET', `/campaigns/${newId()}`));
    expect(missing.status).toBe(404);

    const listed = await api.handle(request('GET', '/campaigns'));
    expect(((await listed.json()) as CampaignJson[]).map(({ id }) => id)).toStrictEqual([mine.id]);
  });
});
