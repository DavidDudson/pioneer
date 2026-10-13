import { describe, expect, test } from 'bun:test';

import {
  CharacterPackService,
  CharacterService,
  InMemoryAttachedCampaignPacks,
  InMemoryCharacterPackCatalog,
  InMemoryCharacterPackRepository,
  InMemoryCharacterRepository,
} from '@pioneer/character/application';
import type { KnownPack } from '@pioneer/character/application';
import { AttachedCampaignName, CharacterName, PackPublisher, PackTitle } from '@pioneer/character/domain';
import type { CharacterId } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackId } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { characterPackRoutes } from './character-pack-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

const core = ContentPackId.parse(newId());
const spells = ContentPackId.parse(newId());
const feats = ContentPackId.parse(newId());
const foreign = ContentPackId.parse(newId());

function known(id: ContentPackId, title: string): KnownPack {
  return { id, title: PackTitle.parse(title), publisher: PackPublisher.parse('Paizo') };
}

/** The routes over a character Amiri owns. */
interface SetUp {
  readonly api: AnyElysia;
  readonly campaigns: InMemoryAttachedCampaignPacks;
  /** Kyra's packs path. */
  readonly path: string;
  readonly characterId: CharacterId;
}

async function setUp(): Promise<SetUp> {
  const clock = fixedClock('2026-10-14T10:00:00Z');
  const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
  const repository = new InMemoryCharacterRepository();
  const kyra = await new CharacterService(repository, content, clock).create(amiri, {
    name: CharacterName.parse('Kyra'),
    ancestry: humanAncestryId,
  });
  const catalog = new InMemoryCharacterPackCatalog()
    .pack({ ...known(core, 'Player Core'), official: true })
    .pack({ ...known(spells, 'Spells'), readers: [amiri] })
    .pack({ ...known(feats, 'Feats'), readers: [amiri] })
    .pack({ ...known(foreign, 'Foreign'), readers: [ezren] })
    .extend(feats, spells);
  const campaigns = new InMemoryAttachedCampaignPacks();
  const service = new CharacterPackService(
    { characters: repository, packs: new InMemoryCharacterPackRepository(), catalog, campaigns },
    clock,
  );
  const api = new Elysia().use(problemHandler).use(characterPackRoutes(service, new FakeAuthenticator()));
  return { api, campaigns, path: `/characters/${kyra.id}/packs`, characterId: kyra.id };
}

interface Sent {
  /** The acting user; undefined sends none. */
  readonly as: UserId | undefined;
  readonly body?: unknown;
}

function request(method: string, path: string, { as, body }: Sent): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(as === undefined ? {} : actingAs(as)) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

interface PackJson {
  readonly packId: string;
  readonly title: string;
  readonly removable: boolean;
  readonly requiredBy: readonly string[];
}

interface PacksJson {
  readonly decidedBy: string;
  readonly campaign?: string;
  readonly manageable: boolean;
  readonly enabled: readonly PackJson[];
  readonly candidates: readonly PackJson[];
}

async function json<TBody>(response: Response): Promise<TBody> {
  return (await response.json()) as TBody;
}

describe('character pack routes', () => {
  test('the owner enables a pack with the packs it extends, then disables them', async () => {
    const { api, path } = await setUp();
    const enabled = await api.handle(request('POST', path, { as: amiri, body: { packId: feats } }));
    expect(enabled.status).toBe(200);
    const packs = await json<PacksJson>(enabled);
    expect(packs.decidedBy).toBe('character');
    expect(packs.manageable).toBe(true);
    expect(packs.enabled.map((pack) => [pack.title, pack.removable])).toStrictEqual([
      ['Player Core', false],
      ['Feats', true],
      ['Spells', false],
    ]);

    await api.handle(request('DELETE', `${path}/${feats}`, { as: amiri }));
    const disabled = await api.handle(request('DELETE', `${path}/${spells}`, { as: amiri }));
    const remaining = await json<PacksJson>(disabled);
    expect(remaining.enabled.map((pack) => pack.title)).toStrictEqual(['Player Core']);
  });

  test('a pack another enabled pack extends cannot be disabled: a 409 naming it', async () => {
    const { api, path } = await setUp();
    await api.handle(request('POST', path, { as: amiri, body: { packId: feats } }));
    const response = await api.handle(request('DELETE', `${path}/${spells}`, { as: amiri }));
    expect(response.status).toBe(409);
  });

  test('a pack the owner may not read is a 404', async () => {
    const { api, path } = await setUp();
    const response = await api.handle(request('POST', path, { as: amiri, body: { packId: foreign } }));
    expect(response.status).toBe(404);
  });

  test('attaching to a campaign switches the effective set, and refuses changes', async () => {
    const { api, campaigns, path, characterId } = await setUp();
    await api.handle(request('POST', path, { as: amiri, body: { packId: spells } }));
    campaigns.attach(characterId, { name: AttachedCampaignName.parse('Abomination Vaults'), packs: [foreign] });

    const read = await json<PacksJson>(await api.handle(request('GET', path, { as: amiri })));
    expect(read.decidedBy).toBe('campaign');
    expect(read.campaign).toBe('Abomination Vaults');
    expect(read.manageable).toBe(false);
    expect(read.enabled.map((pack) => pack.title)).toStrictEqual(['Player Core', 'Foreign']);

    const refused = await api.handle(request('POST', path, { as: amiri, body: { packId: feats } }));
    expect(refused.status).toBe(409);

    campaigns.detach(characterId);
    const back = await json<PacksJson>(await api.handle(request('GET', path, { as: amiri })));
    expect(back.decidedBy).toBe('character');
    expect(back.enabled.map((pack) => pack.title)).toStrictEqual(['Player Core', 'Spells']);
  });

  test("another user's character is a 404, and no user is a 401", async () => {
    const { api, path } = await setUp();
    const stranger = await api.handle(request('GET', path, { as: ezren }));
    const nobody = await api.handle(request('GET', path, { as: undefined }));
    expect(stranger.status).toBe(404);
    expect(nobody.status).toBe(401);
  });
});
