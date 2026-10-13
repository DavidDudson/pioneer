import { describe, expect, test } from 'bun:test';

import {
  CharacterService,
  InMemoryCharacterRepository,
  InMemorySheetModeRepository,
  SheetModeService,
} from '@pioneer/character/application';
import { CharacterName, SheetMode } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { sheetModeRoutes } from './sheet-mode-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

/** The routes over a character Amiri owns. */
interface SetUp {
  /** The sheet-mode routes alone. */
  readonly api: AnyElysia;
  /** Kyra's sheet-mode path. */
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
  const service = new SheetModeService(repository, new InMemorySheetModeRepository(), clock);
  const api = new Elysia().use(problemHandler).use(sheetModeRoutes(service, new FakeAuthenticator()));
  return { api, path: `/characters/${kyra.id}/sheet-mode` };
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

describe('sheet mode routes', () => {
  test('nothing remembered, then the tab switched to', async () => {
    const { api, path } = await setUp();
    const before = await api.handle(request('GET', path, { as: amiri }));
    expect(await before.json()).toStrictEqual({});

    const set = await api.handle(request('PATCH', path, { as: amiri, body: { mode: SheetMode.Encounter } }));
    expect(set.status).toBe(200);
    expect(await set.json()).toStrictEqual({ mode: SheetMode.Encounter });

    const after = await api.handle(request('GET', path, { as: amiri }));
    expect(await after.json()).toStrictEqual({ mode: SheetMode.Encounter });
  });

  test('an unknown tab is refused', async () => {
    const { api, path } = await setUp();
    const response = await api.handle(request('PATCH', path, { as: amiri, body: { mode: 'combat' } }));
    expect(response.status).toBe(422);
  });

  test("signed out is 401; someone else's character is 404", async () => {
    const { api, path } = await setUp();
    const signedOut = await api.handle(request('GET', path, { as: undefined }));
    expect(signedOut.status).toBe(401);
    const read = await api.handle(request('GET', path, { as: ezren }));
    expect(read.status).toBe(404);
    const set = await api.handle(request('PATCH', path, { as: ezren, body: { mode: SheetMode.Plan } }));
    expect(set.status).toBe(404);
  });
});
