import { describe, expect, test } from 'bun:test';

import {
  CharacterAllyService,
  CharacterService,
  InMemoryAttachedCampaignPacks,
  InMemoryCharacterRepository,
} from '@pioneer/character/application';
import { AttachedCampaignName, CampaignAlly, CharacterName } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { characterAllyRoutes } from './character-ally-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const seoni = CampaignAlly.parse({ characterId: newId(), name: 'Seoni' });

interface SetUp {
  readonly api: AnyElysia;
  readonly path: string;
}

async function setUp(): Promise<SetUp> {
  const clock = fixedClock('2026-10-15T10:00:00Z');
  const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
  const repository = new InMemoryCharacterRepository();
  const kyra = await new CharacterService(repository, content, clock).create(amiri, {
    name: CharacterName.parse('Kyra'),
    ancestry: humanAncestryId,
  });
  const campaigns = new InMemoryAttachedCampaignPacks().attach(
    kyra.id,
    { name: AttachedCampaignName.parse('Abomination Vaults'), packs: [], variants: [] },
    [seoni],
  );
  const service = new CharacterAllyService({ characters: repository, campaigns });
  const api = new Elysia().use(problemHandler).use(characterAllyRoutes(service, new FakeAuthenticator()));
  return { api, path: `/characters/${kyra.id}/allies` };
}

function get(path: string, as: UserId | undefined): Request {
  return new Request(`http://localhost${path}`, { headers: as === undefined ? {} : actingAs(as) });
}

describe('character ally routes', () => {
  test('the owner reads the rest of the party', async () => {
    const { api, path } = await setUp();
    const response = await api.handle(get(path, amiri));
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ campaign: 'Abomination Vaults', allies: [seoni] });
  });

  test('another user gets a 404 and nobody signed in a 401', async () => {
    const { api, path } = await setUp();
    const other = await api.handle(get(path, ezren));
    const anonymous = await api.handle(get(path, undefined));
    expect(other.status).toBe(404);
    expect(anonymous.status).toBe(401);
  });
});
