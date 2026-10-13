import { describe, expect, test } from 'bun:test';

import {
  CharacterService,
  InMemoryCharacterRepository,
  InMemoryFeatDisplayRepository,
  FeatDisplayService,
} from '@pioneer/character/application';
import { CharacterName, FeatDisplaySection } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { featDisplayRoutes } from './feat-display-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

/** The routes over a character Amiri owns. */
interface SetUp {
  /** The feat-display routes alone. */
  readonly api: AnyElysia;
  /** Kyra's feat-display path. */
  readonly path: string;
}

async function setUp(): Promise<SetUp> {
  const clock = fixedClock('2026-10-12T10:00:00Z');
  const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
  const repository = new InMemoryCharacterRepository();
  const kyra = await new CharacterService(repository, content, clock).create(amiri, {
    name: CharacterName.parse('Kyra'),
    ancestry: humanAncestryId,
  });
  const service = new FeatDisplayService(repository, new InMemoryFeatDisplayRepository(), clock);
  const api = new Elysia().use(problemHandler).use(featDisplayRoutes(service, new FakeAuthenticator()));
  return { api, path: `/characters/${kyra.id}/feat-display` };
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

const SHOW = { section: FeatDisplaySection.Feats, showGrantOnly: true };

describe('feat display routes', () => {
  test('nothing shown, then the section shown, then hidden again', async () => {
    const { api, path } = await setUp();
    const before = await api.handle(request('GET', path, { as: amiri }));
    expect(await before.json()).toStrictEqual({ showGrantOnly: [] });

    const set = await api.handle(request('PATCH', path, { as: amiri, body: SHOW }));
    expect(set.status).toBe(200);
    expect(await set.json()).toStrictEqual({ showGrantOnly: [FeatDisplaySection.Feats] });

    const after = await api.handle(request('GET', path, { as: amiri }));
    expect(await after.json()).toStrictEqual({ showGrantOnly: [FeatDisplaySection.Feats] });

    const hidden = await api.handle(request('PATCH', path, { as: amiri, body: { ...SHOW, showGrantOnly: false } }));
    expect(await hidden.json()).toStrictEqual({ showGrantOnly: [] });
  });

  test('an unknown section is refused', async () => {
    const { api, path } = await setUp();
    const response = await api.handle(request('PATCH', path, { as: amiri, body: { ...SHOW, section: 'combat' } }));
    expect(response.status).toBe(422);
  });

  test("signed out is 401; someone else's character is 404", async () => {
    const { api, path } = await setUp();
    const signedOut = await api.handle(request('GET', path, { as: undefined }));
    expect(signedOut.status).toBe(401);
    const read = await api.handle(request('GET', path, { as: ezren }));
    expect(read.status).toBe(404);
    const set = await api.handle(request('PATCH', path, { as: ezren, body: SHOW }));
    expect(set.status).toBe(404);
  });
});
