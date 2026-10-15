import { describe, expect, test } from 'bun:test';

import {
  CharacterService,
  CharacterVariantService,
  EffectivePacks,
  InMemoryAttachedCampaignPacks,
  InMemoryCharacterRepository,
  InMemoryCharacterVariantRepository,
} from '@pioneer/character/application';
import { AttachedCampaignName, CharacterName } from '@pioneer/character/domain';
import type { CharacterId } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import {
  contentId,
  ContentLicense,
  ContentPack,
  ContentRegistry,
  EntrySlug,
  PackId,
  VariantRuleId,
} from '@pioneer/rules/sdk';
import type { ContentPackId, ContentSource } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { characterVariantRoutes } from './character-variant-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

const BOOK = { kind: 'book', book: 'gm-core', page: 1 } as const;

const official = ContentPack.define({
  manifest: { id: 'core-rules', title: 'Core Rules', publisher: 'Pioneer', license: ContentLicense.Homebrew },
  ancestries: [],
  creatures: [],
  variantRules: [{ slug: 'variant-rule:without-level', name: 'Proficiency Without Level', sources: [BOOK], rules: [] }],
});

const withoutLevel = VariantRuleId.parse(
  contentId(PackId.parse('core-rules'), EntrySlug.parse('variant-rule:without-level')),
);

const content: ContentSource = {
  registry: async (): Promise<ContentRegistry> => {
    const registry = new ContentRegistry();
    registry.register(official);
    return registry;
  },
};

/** No homebrew packs: the official variant rules are all there is. */
class OfficialOnly extends EffectivePacks {
  readonly #none: readonly ContentPackId[] = [];

  public override async of(): Promise<readonly ContentPackId[]> {
    return this.#none;
  }
}

interface SetUp {
  readonly api: AnyElysia;
  readonly campaigns: InMemoryAttachedCampaignPacks;
  /** Kyra's variant rules path. */
  readonly path: string;
  readonly characterId: CharacterId;
}

async function setUp(): Promise<SetUp> {
  const clock = fixedClock('2026-10-14T10:00:00Z');
  const repository = new InMemoryCharacterRepository();
  const characters = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
  const kyra = await new CharacterService(repository, characters, clock).create(amiri, {
    name: CharacterName.parse('Kyra'),
    ancestry: humanAncestryId,
  });
  const campaigns = new InMemoryAttachedCampaignPacks();
  const service = new CharacterVariantService(
    {
      characters: repository,
      variants: new InMemoryCharacterVariantRepository(),
      content,
      packs: new OfficialOnly(),
      campaigns,
    },
    clock,
  );
  const api = new Elysia().use(problemHandler).use(characterVariantRoutes(service, new FakeAuthenticator()));
  return { api, campaigns, path: `/characters/${kyra.id}/variant-rules`, characterId: kyra.id };
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

interface VariantRulesJson {
  readonly decidedBy: string;
  readonly campaign?: string;
  readonly manageable: boolean;
  readonly enabled: readonly { readonly name: string; readonly packTitle: string }[];
  readonly available: readonly { readonly name: string }[];
}

interface ProblemJson {
  readonly message: { readonly key: string };
}

async function json<TBody>(response: Response): Promise<TBody> {
  return (await response.json()) as TBody;
}

describe('character variant rule routes', () => {
  test('the owner enables a variant rule, then disables it', async () => {
    const { api, path } = await setUp();
    const listed = await json<VariantRulesJson>(await api.handle(request('GET', path, { as: amiri })));
    expect(listed.decidedBy).toBe('character');
    expect(listed.manageable).toBe(true);
    expect(listed.available.map(({ name }) => name)).toStrictEqual(['Proficiency Without Level']);

    const enabled = await api.handle(request('POST', path, { as: amiri, body: { variantId: withoutLevel } }));
    expect(enabled.status).toBe(200);
    const after = await json<VariantRulesJson>(enabled);
    expect(after.enabled.map(({ name, packTitle }) => [name, packTitle])).toStrictEqual([
      ['Proficiency Without Level', 'Core Rules'],
    ]);
    expect(after.available).toStrictEqual([]);

    const disabled = await api.handle(request('DELETE', `${path}/${withoutLevel}`, { as: amiri }));
    expect(disabled.status).toBe(200);
    const remaining = await json<VariantRulesJson>(disabled);
    expect(remaining.enabled).toStrictEqual([]);
  });

  test('a variant rule no pack in use defines is a 404, a malformed id a 422', async () => {
    const { api, path } = await setUp();
    const unknown = await api.handle(request('POST', path, { as: amiri, body: { variantId: newId() } }));
    expect(unknown.status).toBe(404);
    const malformed = await api.handle(request('POST', path, { as: amiri, body: { variantId: 'nope' } }));
    expect(malformed.status).toBe(422);
    const disable = await api.handle(request('DELETE', `${path}/nope`, { as: amiri }));
    expect(disable.status).toBe(422);
  });

  test('another user gets a 404 and no user a 401', async () => {
    const { api, path } = await setUp();
    const body = { variantId: withoutLevel };
    const read = await api.handle(request('GET', path, { as: ezren }));
    const enable = await api.handle(request('POST', path, { as: ezren, body }));
    const disable = await api.handle(request('DELETE', `${path}/${withoutLevel}`, { as: ezren }));
    const anonymous = await api.handle(request('GET', path, { as: undefined }));
    expect([read.status, enable.status, disable.status, anonymous.status]).toStrictEqual([404, 404, 404, 401]);
  });

  test('the campaign decides while the character is in one: a 409 naming it', async () => {
    const { api, campaigns, path, characterId } = await setUp();
    campaigns.attach(characterId, {
      name: AttachedCampaignName.parse('Tuesday Table'),
      packs: [],
      variants: [withoutLevel],
    });
    const listed = await json<VariantRulesJson>(await api.handle(request('GET', path, { as: amiri })));
    expect(listed.decidedBy).toBe('campaign');
    expect(listed.campaign).toBe('Tuesday Table');
    expect(listed.manageable).toBe(false);
    expect(listed.enabled.map(({ name }) => name)).toStrictEqual(['Proficiency Without Level']);

    const refused = await api.handle(request('POST', path, { as: amiri, body: { variantId: withoutLevel } }));
    expect(refused.status).toBe(409);
    const problem = await json<ProblemJson>(refused);
    expect(problem.message.key).toBe('character.variantRules.campaignDecides');
    const disable = await api.handle(request('DELETE', `${path}/${withoutLevel}`, { as: amiri }));
    expect(disable.status).toBe(409);
  });
});
