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

function app(): AnyElysia {
  const clock = fixedClock('2026-10-10T10:00:00Z');
  const campaigns = new InMemoryCampaignRepository();
  const directory = new InMemoryMemberDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren').name(seelah, 'Seelah');
  const inviteRepository = new InMemoryCampaignInviteRepository();
  const service = new CampaignService({ campaigns, invites: inviteRepository, directory }, clock);
  const invites = new CampaignInviteService(campaigns, inviteRepository, clock);
  const partyService = new CampaignPartyService(
    {
      campaigns,
      party: new InMemoryCampaignPartyRepository(),
      characters: new InMemoryCharacterDirectory(),
      directory,
    },
    clock,
  );
  return new Elysia()
    .use(problemHandler)
    .use(campaignRoutes({ campaigns: service, invites, party: partyService }, new FakeAuthenticator()));
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

interface MemberJson {
  readonly id: string;
  readonly userId: string;
  readonly role: string;
}

interface RosterJson {
  readonly viewerRole: string;
  readonly members: readonly MemberJson[];
}

async function json<TBody>(response: Response): Promise<TBody> {
  return (await response.json()) as TBody;
}

/** A campaign run by Amiri with Ezren and Seelah as players, joined through an invite. */
interface Party {
  readonly id: string;
  readonly memberIds: ReadonlyMap<UserId, string>;
  /** The invite everyone joined with, still open. */
  readonly token: string;
}

async function party(api: AnyElysia): Promise<Party> {
  const created = await api.handle(request('POST', '/campaigns', { as: amiri, body: { name: 'Abomination Vaults' } }));
  const { id } = await json<{ readonly id: string }>(created);
  const issued = await api.handle(request('POST', `/campaigns/${id}/invites`, { as: amiri }));
  const { token } = await json<{ readonly token: string }>(issued);
  await api.handle(request('POST', '/campaigns/join', { as: ezren, body: { token } }));
  await api.handle(request('POST', '/campaigns/join', { as: seelah, body: { token } }));
  const roster = await json<RosterJson>(await api.handle(request('GET', `/campaigns/${id}/members`, { as: amiri })));
  const memberIds = new Map(roster.members.map((member) => [UserId.parse(member.userId), member.id] as const));
  return { id, memberIds, token };
}

function memberId({ memberIds }: Party, userId: UserId): string {
  const found = memberIds.get(userId);
  if (found === undefined) {
    throw new Error(`No member ${userId}`);
  }
  return found;
}

describe('member routes', () => {
  test('the GM removes a player, who then gets a 404 on the campaign', async () => {
    const api = app();
    const vaults = await party(api);
    const removed = await api.handle(
      request('DELETE', `/campaigns/${vaults.id}/members/${memberId(vaults, ezren)}`, { as: amiri }),
    );
    expect(removed.status).toBe(200);
    const roster = await json<RosterJson>(removed);
    expect(roster.members.map((member) => member.userId)).toStrictEqual([amiri, seelah]);

    const got = await api.handle(request('GET', `/campaigns/${vaults.id}`, { as: ezren }));
    expect(got.status).toBe(404);
  });

  test('removing a player revokes the open invites, so they cannot rejoin with the old link', async () => {
    const api = app();
    const vaults = await party(api);
    await api.handle(request('DELETE', `/campaigns/${vaults.id}/members/${memberId(vaults, ezren)}`, { as: amiri }));

    const rejoin = await api.handle(request('POST', '/campaigns/join', { as: ezren, body: { token: vaults.token } }));
    expect(rejoin.status).toBe(410);
    const open = await json<readonly unknown[]>(
      await api.handle(request('GET', `/campaigns/${vaults.id}/invites`, { as: amiri })),
    );
    expect(open).toStrictEqual([]);
  });

  test('a player who left may rejoin with a link that still works', async () => {
    const api = app();
    const vaults = await party(api);
    await api.handle(request('POST', `/campaigns/${vaults.id}/leave`, { as: seelah }));
    const rejoin = await api.handle(request('POST', '/campaigns/join', { as: seelah, body: { token: vaults.token } }));
    expect(rejoin.status).toBe(200);
  });

  test('removing the GM is a 403 that says why', async () => {
    const api = app();
    const vaults = await party(api);
    const response = await api.handle(
      request('DELETE', `/campaigns/${vaults.id}/members/${memberId(vaults, amiri)}`, { as: amiri }),
    );
    expect(response.status).toBe(403);
    const problem = await json<Problem>(response);
    expect(problem.message).toStrictEqual({ key: 'campaign.members.gmNotRemovable' });
  });

  test('a player gets 403 on GM actions; a stranger gets 404', async () => {
    const api = app();
    const vaults = await party(api);
    const stranger = UserId.parse(newId());
    const seelahId = memberId(vaults, seelah);
    const asPlayer = await api.handle(request('DELETE', `/campaigns/${vaults.id}/members/${seelahId}`, { as: ezren }));
    expect(asPlayer.status).toBe(403);
    const handOver = await api.handle(
      request('POST', `/campaigns/${vaults.id}/gm`, { as: ezren, body: { memberId: seelahId } }),
    );
    expect(handOver.status).toBe(403);
    const asStranger = await api.handle(
      request('DELETE', `/campaigns/${vaults.id}/members/${seelahId}`, { as: stranger }),
    );
    expect(asStranger.status).toBe(404);
    const leave = await api.handle(request('POST', `/campaigns/${vaults.id}/leave`, { as: stranger }));
    expect(leave.status).toBe(404);
  });

  test('the GM hands the role over and becomes a player', async () => {
    const api = app();
    const vaults = await party(api);
    const response = await api.handle(
      request('POST', `/campaigns/${vaults.id}/gm`, { as: amiri, body: { memberId: memberId(vaults, ezren) } }),
    );
    expect(response.status).toBe(200);
    const roster = await json<RosterJson>(response);
    expect(roster.viewerRole).toBe('player');
    expect(roster.members.map((member) => [member.userId, member.role])).toStrictEqual([
      [amiri, 'player'],
      [ezren, 'gm'],
      [seelah, 'player'],
    ]);
    const got = await json<{ readonly gmId: string }>(
      await api.handle(request('GET', `/campaigns/${vaults.id}`, { as: ezren })),
    );
    expect(got.gmId).toBe(ezren);
  });

  test('handing the role to someone not in the campaign is a 404, and a malformed id a 422', async () => {
    const api = app();
    const vaults = await party(api);
    const unknown = await api.handle(
      request('POST', `/campaigns/${vaults.id}/gm`, { as: amiri, body: { memberId: newId() } }),
    );
    expect(unknown.status).toBe(404);
    const malformed = await api.handle(
      request('POST', `/campaigns/${vaults.id}/gm`, { as: amiri, body: { memberId: 'nope' } }),
    );
    expect(malformed.status).toBe(422);
  });

  test('a player leaves; the GM is told to hand the role over first', async () => {
    const api = app();
    const vaults = await party(api);
    const left = await api.handle(request('POST', `/campaigns/${vaults.id}/leave`, { as: seelah }));
    expect(left.status).toBe(200);
    expect(await left.json()).toStrictEqual({});
    const listed = await json<readonly unknown[]>(await api.handle(request('GET', '/campaigns', { as: seelah })));
    expect(listed).toStrictEqual([]);

    const gm = await api.handle(request('POST', `/campaigns/${vaults.id}/leave`, { as: amiri }));
    expect(gm.status).toBe(403);
    const refusal = await json<Problem>(gm);
    expect(refusal.message).toStrictEqual({ key: 'campaign.members.gmCannotLeave' });
  });
});
