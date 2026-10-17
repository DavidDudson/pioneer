import { describe, expect, test } from 'bun:test';

import {
  CharacterRuleLimitService,
  CharacterService,
  InMemoryAttachedCampaignPacks,
  InMemoryCharacterRepository,
  InMemoryCharacterRuleLimitRepository,
  InMemoryVariantLimits,
} from '@pioneer/character/application';
import { AttachedCampaignName, CORE_RULE_LIMITS } from '@pioneer/character/domain';
import type { CharacterId } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { characterRoutes } from './character-routes';
import { characterRuleLimitRoutes } from './character-rule-limit-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

interface Fixture {
  readonly api: AnyElysia;
  readonly campaigns: InMemoryAttachedCampaignPacks;
}

function fixture(): Fixture {
  const clock = fixedClock('2026-10-17T10:00:00Z');
  const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
  const repository = new InMemoryCharacterRepository();
  const campaigns = new InMemoryAttachedCampaignPacks();
  const limits = new CharacterRuleLimitService(
    {
      characters: repository,
      limits: new InMemoryCharacterRuleLimitRepository(),
      campaigns,
      variantLimits: new InMemoryVariantLimits(),
    },
    clock,
  );
  const auth = new FakeAuthenticator();
  const api = new Elysia()
    .use(problemHandler)
    .use(characterRoutes(new CharacterService(repository, content, clock), auth))
    .use(characterRuleLimitRoutes(limits, auth));
  return { api, campaigns };
}

interface Init {
  readonly method?: string;
  readonly body?: object;
}

function request(path: string, as: UserId, { method = 'GET', body }: Init = {}): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...actingAs(as) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function createdBy(api: AnyElysia, owner: UserId): Promise<CharacterId> {
  const response = await api.handle(
    request('/characters', owner, { method: 'POST', body: { name: 'Seelah', ancestry: humanAncestryId } }),
  );
  return ((await response.json()) as { id: CharacterId }).id;
}

describe('character rule-limit settings routes', () => {
  test('the owner reads, sets and resets a limit', async () => {
    const { api } = fixture();
    const id = await createdBy(api, ezren);
    const path = `/characters/${id}/rule-limit-settings`;

    const set = await api.handle(request(`${path}/investedMax`, ezren, { method: 'POST', body: { value: 12 } }));
    expect(set.status).toBe(200);
    expect(((await set.json()) as { limits: { value: number }[] }).limits[0]?.value).toBe(12);

    const reset = await api.handle(request(`${path}/investedMax`, ezren, { method: 'DELETE' }));
    const settings = (await reset.json()) as { limits: { value: number; custom: boolean }[] };
    expect(settings.limits[0]).toMatchObject({ value: CORE_RULE_LIMITS.investedMax, custom: false });
  });

  test('a number past the ceiling is a 422', async () => {
    const { api } = fixture();
    const id = await createdBy(api, ezren);
    const response = await api.handle(
      request(`/characters/${id}/rule-limit-settings/handsMax`, ezren, { method: 'POST', body: { value: 11 } }),
    );
    expect(response.status).toBe(422);
  });

  test('another user gets a 404', async () => {
    const { api } = fixture();
    const id = await createdBy(api, ezren);
    const path = `/characters/${id}/rule-limit-settings`;
    const read = await api.handle(request(path, amiri));
    const set = await api.handle(request(`${path}/itemsMax`, amiri, { method: 'POST', body: { value: 9 } }));
    expect([read.status, set.status]).toStrictEqual([404, 404]);
  });

  test('a campaign decides, so the owner’s change is a 409', async () => {
    const { api, campaigns } = fixture();
    const id = await createdBy(api, ezren);
    campaigns.attach(id, { name: AttachedCampaignName.parse('Abomination Vaults'), packs: [], variants: [] });
    const response = await api.handle(
      request(`/characters/${id}/rule-limit-settings/itemsMax`, ezren, { method: 'POST', body: { value: 9 } }),
    );
    expect(response.status).toBe(409);
  });
});
