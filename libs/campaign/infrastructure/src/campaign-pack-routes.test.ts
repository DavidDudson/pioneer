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
  InMemoryPackCatalog,
} from '@pioneer/campaign/application';
import type { KnownPack } from '@pioneer/campaign/application';
import { EnabledPackId, PackPublisher, PackTitle } from '@pioneer/campaign/domain';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
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

const core = EnabledPackId.parse(newId());
const spells = EnabledPackId.parse(newId());
const feats = EnabledPackId.parse(newId());
const secret = EnabledPackId.parse(newId());
const foreign = EnabledPackId.parse(newId());

function known(id: EnabledPackId, title: string): KnownPack {
  return { id, title: PackTitle.parse(title), publisher: PackPublisher.parse('Paizo') };
}

function app(): AnyElysia {
  const clock = fixedClock('2026-10-10T10:00:00Z');
  const campaigns = new InMemoryCampaignRepository();
  const directory = new InMemoryMemberDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren');
  const inviteRepository = new InMemoryCampaignInviteRepository();
  const catalog = new InMemoryPackCatalog()
    .pack({ ...known(core, 'Player Core'), official: true })
    .pack({ ...known(spells, 'Spells'), readers: [amiri] })
    .pack({ ...known(feats, 'Feats'), readers: [amiri] })
    .pack({ ...known(secret, 'Secret'), readers: [amiri], private: true })
    .pack({ ...known(foreign, 'Foreign'), readers: [ezren] })
    .extend(feats, spells);
  const party = new CampaignPartyService(
    {
      campaigns,
      party: new InMemoryCampaignPartyRepository(campaigns),
      characters: new InMemoryCharacterDirectory(),
      directory,
    },
    clock,
  );
  const services = {
    campaigns: new CampaignService({ campaigns, invites: inviteRepository, directory }, clock),
    invites: new CampaignInviteService(campaigns, inviteRepository, clock),
    party,
    packs: packService(campaigns, clock, catalog),
    variants: variantService(campaigns, clock),
    ruleLimits: ruleLimitService(campaigns, clock),
    itemApprovals: itemApprovalService(campaigns, clock),
    keyItems: keyItemService(campaigns, clock),
    itemTransfers: itemTransferService(campaigns, clock),
    partyStash: partyStashService(campaigns),
  };
  return new Elysia().use(problemHandler).use(campaignRoutes(services, new FakeAuthenticator()));
}

/** Who sends a request, and what. */
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

interface PackJson {
  readonly packId: string;
  readonly title: string;
  readonly official: boolean;
  readonly removable: boolean;
  readonly requiredBy: readonly string[];
}

interface PacksJson {
  readonly manageable: boolean;
  readonly enabled: readonly PackJson[];
  readonly candidates: readonly (PackJson & { readonly private: boolean })[];
}

async function json<TBody>(response: Response): Promise<TBody> {
  return (await response.json()) as TBody;
}

/** A campaign run by Amiri with Ezren as a player; its id. */
async function campaign(api: AnyElysia): Promise<string> {
  const created = await api.handle(request('POST', '/campaigns', { as: amiri, body: { name: 'Abomination Vaults' } }));
  const { id } = await json<{ readonly id: string }>(created);
  const issued = await api.handle(request('POST', `/campaigns/${id}/invites`, { as: amiri }));
  const { token } = await json<{ readonly token: string }>(issued);
  await api.handle(request('POST', '/campaigns/join', { as: ezren, body: { token } }));
  return id;
}

describe('pack routes', () => {
  test('the GM enables a pack with the packs it extends; a player sees them', async () => {
    const api = app();
    const id = await campaign(api);
    const enabled = await api.handle(request('POST', `/campaigns/${id}/packs`, { as: amiri, body: { packId: feats } }));
    expect(enabled.status).toBe(200);
    const asGm = await json<PacksJson>(enabled);
    expect(asGm.manageable).toBe(true);
    expect(asGm.enabled.map((pack) => [pack.title, pack.removable])).toStrictEqual([
      ['Player Core', false],
      ['Feats', true],
      ['Spells', false],
    ]);
    expect(asGm.enabled.find((pack) => pack.title === 'Spells')?.requiredBy).toStrictEqual(['Feats']);
    expect(asGm.candidates.map((pack) => pack.title)).toStrictEqual(['Secret']);

    const seen = await api.handle(request('GET', `/campaigns/${id}/packs`, { as: ezren }));
    const asPlayer = await json<PacksJson>(seen);
    expect(asPlayer.manageable).toBe(false);
    expect(asPlayer.enabled.map((pack) => pack.title)).toStrictEqual(['Player Core', 'Feats', 'Spells']);
    expect(asPlayer.candidates).toStrictEqual([]);
  });

  test('a private pack is a 409 that says why', async () => {
    const api = app();
    const id = await campaign(api);
    const response = await api.handle(
      request('POST', `/campaigns/${id}/packs`, { as: amiri, body: { packId: secret } }),
    );
    expect(response.status).toBe(409);
    const problem = await json<Problem>(response);
    expect(problem.type).toBe('conflict');
    expect(problem.message).toStrictEqual({ key: 'campaign.packs.private', params: { pack: 'Secret' } });
  });

  test('an unreadable pack is a 404 and a malformed id a 422', async () => {
    const api = app();
    const id = await campaign(api);
    const unreadable = await api.handle(
      request('POST', `/campaigns/${id}/packs`, { as: amiri, body: { packId: foreign } }),
    );
    expect(unreadable.status).toBe(404);
    const malformed = await api.handle(
      request('POST', `/campaigns/${id}/packs`, { as: amiri, body: { packId: 'nope' } }),
    );
    expect(malformed.status).toBe(422);
    const disable = await api.handle(request('DELETE', `/campaigns/${id}/packs/nope`, { as: amiri }));
    expect(disable.status).toBe(422);
  });

  test('a player gets a 403 and a stranger a 404', async () => {
    const api = app();
    const id = await campaign(api);
    const byPlayer = await api.handle(
      request('POST', `/campaigns/${id}/packs`, { as: ezren, body: { packId: spells } }),
    );
    expect(byPlayer.status).toBe(403);
    const disabledByPlayer = await api.handle(request('DELETE', `/campaigns/${id}/packs/${spells}`, { as: ezren }));
    expect(disabledByPlayer.status).toBe(403);
    const byStranger = await api.handle(
      request('POST', `/campaigns/${id}/packs`, { as: stranger, body: { packId: spells } }),
    );
    expect(byStranger.status).toBe(404);
    const unseen = await api.handle(request('GET', `/campaigns/${id}/packs`, { as: stranger }));
    expect(unseen.status).toBe(404);
  });

  test('the GM disables a pack, but not an official one or one another still extends', async () => {
    const api = app();
    const id = await campaign(api);
    await api.handle(request('POST', `/campaigns/${id}/packs`, { as: amiri, body: { packId: feats } }));

    const official = await api.handle(request('DELETE', `/campaigns/${id}/packs/${core}`, { as: amiri }));
    expect(official.status).toBe(409);
    const alwaysOn = await json<Problem>(official);
    expect(alwaysOn.message).toStrictEqual({ key: 'campaign.packs.alwaysOnRefusal' });

    const extended = await api.handle(request('DELETE', `/campaigns/${id}/packs/${spells}`, { as: amiri }));
    expect(extended.status).toBe(409);
    const requiredBy = await json<Problem>(extended);
    expect(requiredBy.message).toStrictEqual({ key: 'campaign.packs.requiredByRefusal', params: { packs: 'Feats' } });

    const disabled = await api.handle(request('DELETE', `/campaigns/${id}/packs/${feats}`, { as: amiri }));
    expect(disabled.status).toBe(200);
    const remaining = await json<PacksJson>(disabled);
    expect(remaining.enabled.map((pack) => pack.title)).toStrictEqual(['Player Core', 'Spells']);
  });
});
