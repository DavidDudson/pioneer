import { describe, expect, test } from 'bun:test';

import {
  CampaignInviteService,
  CampaignService,
  InMemoryCampaignInviteRepository,
  InMemoryCampaignRepository,
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

function app(): AnyElysia {
  const clock = fixedClock('2026-10-10T10:00:00Z');
  const campaigns = new InMemoryCampaignRepository();
  const directory = new InMemoryMemberDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren');
  const service = new CampaignService(campaigns, directory, clock);
  const invites = new CampaignInviteService(campaigns, new InMemoryCampaignInviteRepository(), clock);
  return new Elysia().use(problemHandler).use(campaignRoutes(service, invites, new FakeAuthenticator()));
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

interface IssuedJson {
  readonly invite: { readonly id: string; readonly expiresAt: string; readonly revokedAt?: string };
  readonly token: string;
}

interface RosterJson {
  readonly viewerRole: string;
  readonly members: readonly { readonly displayName: string; readonly role: string }[];
}

async function json<TBody>(response: Response): Promise<TBody> {
  return (await response.json()) as TBody;
}

/** A campaign run by Amiri, and an invite to it. */
interface CampaignWithInvite {
  readonly id: string;
  readonly issued: IssuedJson;
}

async function campaignWithInvite(api: AnyElysia): Promise<CampaignWithInvite> {
  const created = await api.handle(request('POST', '/campaigns', { as: amiri, body: { name: 'Abomination Vaults' } }));
  const { id } = await json<{ readonly id: string }>(created);
  const issued = await json<IssuedJson>(await api.handle(request('POST', `/campaigns/${id}/invites`, { as: amiri })));
  return { id, issued };
}

describe('invite routes', () => {
  test('the GM creates an invite, a user joins with it, and the roster names both', async () => {
    const api = app();
    const { id, issued } = await campaignWithInvite(api);
    expect(issued.invite.expiresAt).toBe('2026-10-17T10:00:00.000Z');
    expect(Object.keys(issued.invite)).not.toContain('tokenHash');

    const listed = await api.handle(request('GET', `/campaigns/${id}/invites`, { as: amiri }));
    expect(await json<unknown>(listed)).toStrictEqual([issued.invite]);

    const joined = await api.handle(request('POST', '/campaigns/join', { as: ezren, body: { token: issued.token } }));
    expect(joined.status).toBe(200);
    const joinedCampaign = await json<{ readonly id: string }>(joined);
    expect(joinedCampaign.id).toBe(id);

    const roster = await json<RosterJson>(await api.handle(request('GET', `/campaigns/${id}/members`, { as: ezren })));
    expect(roster.viewerRole).toBe('player');
    expect(roster.members.map(({ displayName, role }) => [displayName, role])).toStrictEqual([
      ['Amiri', 'gm'],
      ['Ezren', 'player'],
    ]);
  });

  test('joining twice is the same campaign, not an error', async () => {
    const api = app();
    const { issued } = await campaignWithInvite(api);
    const first = await api.handle(request('POST', '/campaigns/join', { as: ezren, body: { token: issued.token } }));
    const second = await api.handle(request('POST', '/campaigns/join', { as: ezren, body: { token: issued.token } }));
    expect(second.status).toBe(200);
    expect(await json<unknown>(second)).toStrictEqual(await json<unknown>(first));
  });

  test('a revoked invite is a 410 with its own message', async () => {
    const api = app();
    const { id, issued } = await campaignWithInvite(api);
    const revoked = await api.handle(request('DELETE', `/campaigns/${id}/invites/${issued.invite.id}`, { as: amiri }));
    const revokedInvite = await json<IssuedJson['invite']>(revoked);
    expect(revokedInvite.revokedAt).toBe('2026-10-10T10:00:00.000Z');

    const response = await api.handle(request('POST', '/campaigns/join', { as: ezren, body: { token: issued.token } }));
    expect(response.status).toBe(410);
    const problem = await json<Problem>(response);
    expect(problem.type).toBe('gone');
    expect(problem.message).toStrictEqual({ key: 'campaign.join.revokedInvite' });
  });

  test('an unknown token is a 404 with its own message; a malformed one is a 422', async () => {
    const api = app();
    const unknown = await api.handle(
      request('POST', '/campaigns/join', { as: ezren, body: { token: 'A'.repeat(43) } }),
    );
    expect(unknown.status).toBe(404);
    const unknownProblem = await json<Problem>(unknown);
    expect(unknownProblem.message).toStrictEqual({ key: 'campaign.join.unknownInvite' });
    const malformed = await api.handle(request('POST', '/campaigns/join', { as: ezren, body: { token: 'short' } }));
    expect(malformed.status).toBe(422);
  });

  test('a player may not manage invites (403); a stranger finds nothing (404)', async () => {
    const api = app();
    const { id, issued } = await campaignWithInvite(api);
    await api.handle(request('POST', '/campaigns/join', { as: ezren, body: { token: issued.token } }));

    const asPlayer = await api.handle(request('POST', `/campaigns/${id}/invites`, { as: ezren }));
    expect(asPlayer.status).toBe(403);
    const playerRevoke = await api.handle(
      request('DELETE', `/campaigns/${id}/invites/${issued.invite.id}`, { as: ezren }),
    );
    expect(playerRevoke.status).toBe(403);

    const asStranger = await api.handle(request('GET', `/campaigns/${id}/invites`, { as: seelah }));
    expect(asStranger.status).toBe(404);
    const strangerRoster = await api.handle(request('GET', `/campaigns/${id}/members`, { as: seelah }));
    expect(strangerRoster.status).toBe(404);
  });
});
