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
  InMemoryVariantRuleCatalog,
} from '@pioneer/campaign/application';
import { CampaignId, EnabledVariantRuleId, PackTitle, VariantRuleName } from '@pioneer/campaign/domain';
import type { VariantRuleOption } from '@pioneer/campaign/domain';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { campaignRoutes } from './campaign-routes';
import { packService, itemApprovalService, ruleLimitService, variantService } from './testing/campaign-pack-fixtures';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const stranger = UserId.parse(newId());

function option(name: string, packTitle: string): VariantRuleOption {
  return {
    variantId: EnabledVariantRuleId.parse(newId()),
    name: VariantRuleName.parse(name),
    packTitle: PackTitle.parse(packTitle),
  };
}

const withoutLevel = option('Proficiency Without Level', 'Core Rules');
const gritty = option('Gritty Healing', 'Table Rules');

interface Api {
  readonly handler: AnyElysia;
  readonly catalog: InMemoryVariantRuleCatalog;
}

function app(): Api {
  const clock = fixedClock('2026-10-14T10:00:00Z');
  const campaigns = new InMemoryCampaignRepository();
  const directory = new InMemoryMemberDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren');
  const inviteRepository = new InMemoryCampaignInviteRepository();
  const catalog = new InMemoryVariantRuleCatalog();
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
    packs: packService(campaigns, clock),
    variants: variantService(campaigns, clock, catalog),
    ruleLimits: ruleLimitService(campaigns, clock),
    itemApprovals: itemApprovalService(campaigns, clock),
  };
  const handler = new Elysia().use(problemHandler).use(campaignRoutes(services, new FakeAuthenticator()));
  return { handler, catalog };
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

interface VariantRulesJson {
  readonly manageable: boolean;
  readonly enabled: readonly { readonly name: string; readonly packTitle: string }[];
  readonly available: readonly { readonly name: string }[];
}

async function json<TBody>(response: Response): Promise<TBody> {
  return (await response.json()) as TBody;
}

/** A campaign run by Amiri with Ezren as a player, offering both variant rules; its id. */
async function campaign({ handler, catalog }: Api): Promise<string> {
  const created = await handler.handle(
    request('POST', '/campaigns', { as: amiri, body: { name: 'Abomination Vaults' } }),
  );
  const { id } = await json<{ readonly id: string }>(created);
  const issued = await handler.handle(request('POST', `/campaigns/${id}/invites`, { as: amiri }));
  const { token } = await json<{ readonly token: string }>(issued);
  await handler.handle(request('POST', '/campaigns/join', { as: ezren, body: { token } }));
  catalog.offer(CampaignId.parse(id), [withoutLevel, gritty]);
  return id;
}

describe('variant rule routes', () => {
  test('the GM enables a variant rule; a player sees it', async () => {
    const api = app();
    const id = await campaign(api);
    const enabled = await api.handler.handle(
      request('POST', `/campaigns/${id}/variant-rules`, { as: amiri, body: { variantId: withoutLevel.variantId } }),
    );
    expect(enabled.status).toBe(200);
    const asGm = await json<VariantRulesJson>(enabled);
    expect(asGm.manageable).toBe(true);
    expect(asGm.enabled.map(({ name, packTitle }) => [name, packTitle])).toStrictEqual([
      ['Proficiency Without Level', 'Core Rules'],
    ]);
    expect(asGm.available.map(({ name }) => name)).toStrictEqual(['Gritty Healing']);

    const seen = await api.handler.handle(request('GET', `/campaigns/${id}/variant-rules`, { as: ezren }));
    const asPlayer = await json<VariantRulesJson>(seen);
    expect(asPlayer.manageable).toBe(false);
    expect(asPlayer.enabled.map(({ name }) => name)).toStrictEqual(['Proficiency Without Level']);
    expect(asPlayer.available).toStrictEqual([]);
  });

  test('a variant rule no pack in use defines is a 404, a malformed id a 422', async () => {
    const api = app();
    const id = await campaign(api);
    const unknown = await api.handler.handle(
      request('POST', `/campaigns/${id}/variant-rules`, { as: amiri, body: { variantId: newId() } }),
    );
    expect(unknown.status).toBe(404);
    const malformed = await api.handler.handle(
      request('POST', `/campaigns/${id}/variant-rules`, { as: amiri, body: { variantId: 'nope' } }),
    );
    expect(malformed.status).toBe(422);
    const disable = await api.handler.handle(request('DELETE', `/campaigns/${id}/variant-rules/nope`, { as: amiri }));
    expect(disable.status).toBe(422);
  });

  test('a player gets a 403 and a stranger a 404', async () => {
    const api = app();
    const id = await campaign(api);
    const body = { variantId: gritty.variantId };
    const byPlayer = await api.handler.handle(request('POST', `/campaigns/${id}/variant-rules`, { as: ezren, body }));
    expect(byPlayer.status).toBe(403);
    const disabledByPlayer = await api.handler.handle(
      request('DELETE', `/campaigns/${id}/variant-rules/${gritty.variantId}`, { as: ezren }),
    );
    expect(disabledByPlayer.status).toBe(403);
    const byStranger = await api.handler.handle(
      request('POST', `/campaigns/${id}/variant-rules`, { as: stranger, body }),
    );
    expect(byStranger.status).toBe(404);
    const unseen = await api.handler.handle(request('GET', `/campaigns/${id}/variant-rules`, { as: stranger }));
    expect(unseen.status).toBe(404);
  });

  test('the GM disables a variant rule', async () => {
    const api = app();
    const id = await campaign(api);
    await api.handler.handle(
      request('POST', `/campaigns/${id}/variant-rules`, { as: amiri, body: { variantId: gritty.variantId } }),
    );
    const disabled = await api.handler.handle(
      request('DELETE', `/campaigns/${id}/variant-rules/${gritty.variantId}`, { as: amiri }),
    );
    expect(disabled.status).toBe(200);
    const remaining = await json<VariantRulesJson>(disabled);
    expect(remaining.enabled).toStrictEqual([]);
  });
});
