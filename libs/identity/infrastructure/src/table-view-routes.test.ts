import { describe, expect, test } from 'bun:test';

import { InMemoryTableViewRepository, TableViewService } from '@pioneer/identity/application';
import { TableViewPreferences, UserId } from '@pioneer/identity/domain';
import { fixedClock, newId } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';
import * as z from 'zod';

import { tableViewRoutes } from './table-view-routes';

const JsonBody = z.record(z.string(), z.json());

/** A request body as JSON, before the route parses it. */
type JsonBody = z.infer<typeof JsonBody>;

function app(): AnyElysia {
  const views = new TableViewService(new InMemoryTableViewRepository(), fixedClock('2026-10-09T08:00:00Z'));

  return new Elysia().use(problemHandler).use(tableViewRoutes(views, new FakeAuthenticator()));
}

function url(entity: string): string {
  return `http://localhost/me/table-views/${entity}`;
}

/** One request: the table, the body a PUT sends, and who asks (nobody, when absent). */
interface Ask {
  readonly entity: string;
  readonly body?: JsonBody;
  readonly user?: UserId;
}

function headersFor(user: UserId | undefined): Headers {
  return new Headers(user === undefined ? undefined : actingAs(user));
}

async function read(api: AnyElysia, { entity, user }: Ask): Promise<Response> {
  return api.handle(new Request(url(entity), { headers: headersFor(user) }));
}

async function save(api: AnyElysia, { entity, body, user }: Ask): Promise<Response> {
  const headers = headersFor(user);
  headers.set('content-type', 'application/json');

  return api.handle(new Request(url(entity), { method: 'PUT', headers, body: JSON.stringify(body ?? {}) }));
}

/** What a read of `entity` answers with, as JSON. */
async function stored(api: AnyElysia, ask: Ask): Promise<TableViewPreferences> {
  const response = await read(api, ask);

  return TableViewPreferences.parse(await response.json());
}

function amiri(): UserId {
  return UserId.parse(newId());
}

describe('table view routes', () => {
  test('a table nobody changed has nothing chosen', async () => {
    const response = await read(app(), { entity: 'characters', user: amiri() });
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({});
  });

  test('PUT replaces the whole preference and GET reads it back', async () => {
    const api = app();
    const user = amiri();
    await save(api, { entity: 'characters', body: { columns: ['name', 'level'], density: 'compact' }, user });
    const replaced = await save(api, { entity: 'characters', body: { columns: ['name'] }, user });
    expect(replaced.status).toBe(200);
    expect(await replaced.json()).toStrictEqual({ columns: ['name'] });
    expect(await stored(api, { entity: 'characters', user })).toStrictEqual(
      TableViewPreferences.parse({ columns: ['name'] }),
    );
  });

  test('tables keep their own preferences', async () => {
    const api = app();
    const user = amiri();
    await save(api, { entity: 'characters', body: { density: 'compact' }, user });
    expect(await stored(api, { entity: 'campaigns', user })).toStrictEqual({});
  });

  test("one user's preferences never show for another", async () => {
    const api = app();
    await save(api, { entity: 'characters', body: { density: 'compact' }, user: amiri() });
    expect(await stored(api, { entity: 'characters', user: amiri() })).toStrictEqual({});
  });

  test('saved views round-trip by name', async () => {
    const api = app();
    const user = amiri();
    const body = { savedViews: [{ name: 'Casters', columns: ['name', 'traits'], density: 'compact' }] };
    await save(api, { entity: 'characters', body, user });
    expect(await stored(api, { entity: 'characters', user })).toStrictEqual(TableViewPreferences.parse(body));
  });

  test.each([
    ['an unknown density', { density: 'tiny' }],
    ['an unknown field', { theme: 'tavern' }],
    ['a repeated column', { columns: ['name', 'name'] }],
    ['two saved views with one name', { savedViews: [{ name: 'A' }, { name: 'A' }] }],
    ['a saved view with no name', { savedViews: [{ density: 'compact' }] }],
  ])('PUT with %s is a 422 problem', async (_case, body) => {
    const response = await save(app(), { entity: 'characters', body, user: amiri() });
    expect(response.status).toBe(422);
    // SAFETY: the API's error handler answers failures with an RFC 9457 `Problem` body, and the status asserted above is such a failure.
    const problem = (await response.json()) as Problem;
    expect(problem.type).toBe('validation');
  });

  test('an entity that is not a slug is a 422 problem', async () => {
    const response = await save(app(), { entity: 'Not%20A%20Slug', user: amiri() });
    expect(response.status).toBe(422);
  });

  test('views need a session, and a bad body without one is still a 401', async () => {
    const api = app();

    const responses = await Promise.all([
      read(api, { entity: 'characters' }),
      save(api, { entity: 'characters' }),
      save(api, { entity: 'characters', body: { density: 'tiny' } }),
    ]);

    expect(responses.map((response) => response.status)).toStrictEqual([401, 401, 401]);
  });
});
