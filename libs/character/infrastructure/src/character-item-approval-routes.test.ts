import { describe, expect, test } from 'bun:test';

import {
  CharacterFlaggedItems,
  CharacterItemApprovalService,
  CharacterService,
  InMemoryAttachedCampaignPacks,
  InMemoryCharacterItemAcknowledgementRepository,
  InMemoryCharacterRepository,
} from '@pioneer/character/application';
import { AttachedCampaignName } from '@pioneer/character/domain';
import type { CharacterId } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { characterItemApprovalRoutes } from './character-item-approval-routes';
import { characterRoutes } from './character-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const SOME_ITEM = newId();
const SOME_ACKNOWLEDGEMENT = newId();

interface Fixture {
  readonly api: AnyElysia;
  readonly campaigns: InMemoryAttachedCampaignPacks;
}

function fixture(): Fixture {
  const clock = fixedClock('2026-11-06T10:00:00Z');
  const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
  const repository = new InMemoryCharacterRepository();
  const campaigns = new InMemoryAttachedCampaignPacks();
  const approvals = new CharacterItemApprovalService(
    {
      characters: repository,
      acknowledgements: new InMemoryCharacterItemAcknowledgementRepository(),
      campaigns,
      flagged: new CharacterFlaggedItems(content),
    },
    clock,
  );
  const auth = new FakeAuthenticator();
  const api = new Elysia()
    .use(problemHandler)
    .use(characterRoutes(new CharacterService(repository, content, clock), auth))
    .use(characterItemApprovalRoutes(approvals, auth));
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

describe('character item-approval routes', () => {
  test('the owner of a character outside a campaign reads its approvals and may acknowledge', async () => {
    const { api } = fixture();
    const id = await createdBy(api, ezren);

    const response = await api.handle(request(`/characters/${id}/item-approvals`, ezren));

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ acknowledgeable: true, approvals: [] });
  });

  test('acknowledging a line that breaks no rule is a 404', async () => {
    const { api } = fixture();
    const id = await createdBy(api, ezren);
    const body = { item: SOME_ITEM, rule: 'invested' };

    const response = await api.handle(
      request(`/characters/${id}/item-acknowledgements`, ezren, { method: 'POST', body }),
    );

    expect(response.status).toBe(404);
  });

  test('revoking an acknowledgement that does not exist is no change', async () => {
    const { api } = fixture();
    const id = await createdBy(api, ezren);

    const response = await api.handle(
      request(`/characters/${id}/item-acknowledgements/${SOME_ACKNOWLEDGEMENT}`, ezren, { method: 'DELETE' }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ acknowledgeable: true, approvals: [] });
  });

  test('another user gets a 404 to read, acknowledge and revoke', async () => {
    const { api } = fixture();
    const id = await createdBy(api, ezren);
    const body = { item: SOME_ITEM, rule: 'invested' };

    const read = await api.handle(request(`/characters/${id}/item-approvals`, amiri));
    const acknowledge = await api.handle(
      request(`/characters/${id}/item-acknowledgements`, amiri, { method: 'POST', body }),
    );
    const revoke = await api.handle(
      request(`/characters/${id}/item-acknowledgements/${SOME_ACKNOWLEDGEMENT}`, amiri, { method: 'DELETE' }),
    );

    expect([read.status, acknowledge.status, revoke.status]).toStrictEqual([404, 404, 404]);
  });

  test('a campaign’s GM approves, so the owner’s acknowledgement is a 409 naming the campaign', async () => {
    const { api, campaigns } = fixture();
    const id = await createdBy(api, ezren);
    campaigns.attach(id, { name: AttachedCampaignName.parse('Abomination Vaults'), packs: [], variants: [] });
    const body = { item: SOME_ITEM, rule: 'invested' };

    const response = await api.handle(
      request(`/characters/${id}/item-acknowledgements`, ezren, { method: 'POST', body }),
    );

    expect(response.status).toBe(409);
    const problem = (await response.json()) as { message: { key: string; params: object } };
    expect(problem.message).toStrictEqual({
      key: 'character.itemApprovals.campaignApproves',
      params: { campaign: 'Abomination Vaults' },
    });
  });
});
