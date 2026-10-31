import { describe, expect, test } from 'bun:test';

import {
  ExportFetchProblem,
  InMemoryCharacterRepository,
  InMemoryCharacterVariantRepository,
  InMemoryPathbuilderExportFetcher,
  PathbuilderExportService,
  PathbuilderImportService,
} from '@pioneer/character/application';
import { briarRoseExport } from '@pioneer/interop/pathbuilder/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { pathbuilderImportRoutes } from './pathbuilder-import-routes';

const PATH = '/characters/import/pathbuilder/fetch';
const amiri = UserId.parse(newId());

interface AppUnderTest {
  readonly api: AnyElysia;
  readonly fetcher: InMemoryPathbuilderExportFetcher;
}

/** The routes over a fetcher that serves Briar Rose, and that fetcher, to see what it was asked for. */
function app(): AppUnderTest {
  const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
  const clock = fixedClock('2026-10-07T10:00:00Z');
  const repository = new InMemoryCharacterRepository();
  const importer = new PathbuilderImportService(
    { characters: repository, content, variants: new InMemoryCharacterVariantRepository() },
    clock,
  );
  const fetcher = new InMemoryPathbuilderExportFetcher({ ok: true, json: briarRoseExport });
  const api = new Elysia()
    .use(problemHandler)
    .use(
      pathbuilderImportRoutes({ importer, exports: new PathbuilderExportService(fetcher) }, new FakeAuthenticator()),
    );
  return { api, fetcher };
}

function post(url: string, signedIn = true): Request {
  return new Request(`http://localhost${PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(signedIn ? actingAs(amiri) : {}) },
    body: JSON.stringify({ url }),
  });
}

describe('Pathbuilder export fetch route', () => {
  test('fetches only the clean export URL for a link with tracking parameters, and returns the export', async () => {
    const { api, fetcher } = app();
    const response = await api.handle(post('https://pathbuilder2e.com/json.php?id=477708&fbclid=IwAR0abc'));

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ export: briarRoseExport });
    expect(fetcher.asked.map(String)).toStrictEqual(['https://pathbuilder2e.com/json.php?id=477708']);
  });

  test.each([
    ['another host', 'https://evil.test/json.php?id=1', 'character.validation.exportUrl.foreignHost'],
    ['a non-numeric id', 'https://pathbuilder2e.com/json.php?id=abc', 'character.validation.exportUrl.badId'],
    ['text that is not a link', 'not a link', 'character.validation.exportUrl.notUrl'],
  ])('%s is a 422 on the url field, and nothing is fetched', async (_name, url, key) => {
    const { api, fetcher } = app();
    const response = await api.handle(post(url));

    expect(response.status).toBe(422);
    expect(((await response.json()) as Problem).issues).toStrictEqual([{ path: ['url'], message: { key } }]);
    expect(fetcher.asked).toStrictEqual([]);
  });

  test('a fetch that fails is a 422 naming why', async () => {
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    const importer = new PathbuilderImportService(
      {
        characters: new InMemoryCharacterRepository(),
        content,
        variants: new InMemoryCharacterVariantRepository(),
      },
      fixedClock('2026-10-07T10:00:00Z'),
    );
    const failing = new InMemoryPathbuilderExportFetcher({ ok: false, problem: ExportFetchProblem.TimedOut });
    const api = new Elysia()
      .use(problemHandler)
      .use(
        pathbuilderImportRoutes({ importer, exports: new PathbuilderExportService(failing) }, new FakeAuthenticator()),
      );
    const response = await api.handle(post('https://pathbuilder2e.com/json.php?id=1'));

    expect(response.status).toBe(422);
    expect(((await response.json()) as Problem).issues?.[0]?.message.key).toBe(
      'character.validation.exportUrl.timedOut',
    );
  });

  test('needs a signed-in user', async () => {
    const { api, fetcher } = app();
    const response = await api.handle(post('https://pathbuilder2e.com/json.php?id=1', false));

    expect(response.status).toBe(401);
    expect(fetcher.asked).toStrictEqual([]);
  });
});
