import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { fixtureOwnerId, humanAncestryId } from '@pioneer/character/domain/testing';
import { mordredExport } from '@pioneer/interop/pathbuilder/testing';
import { fixedClock } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, createTestDatabase, FakeAuthenticator, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { characters } from './characters';
import { seedOfficialContent } from './content';

/**
 * The character routes as the composition root wires them, against content seeded into a throwaway Postgres database
 * (see createTestDatabase). Skipped when TEST_DATABASE_URL is unset; CI always sets it.
 */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-11T10:00:00Z');

function request(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...actingAs(fixtureOwnerId) },
    body: JSON.stringify(body),
  });
}

function ignore(): void {
  // Seed log lines are not under test.
}

describe.skipIf(adminUrl === undefined)('character routes on seeded content (postgres)', () => {
  let database: TestDatabase;
  let api: AnyElysia;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    const at = clock.now().toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${fixtureOwnerId}, 'Owner', false, ${at}, ${at})`,
    );
    api = new Elysia().use(problemHandler).use(characters(database.db, clock, new FakeAuthenticator()));
  });

  afterAll(async () => {
    await database.drop();
  });

  test('content seeded after the routes started is served without a restart', async () => {
    const unseeded = await api.handle(request('/characters', { name: 'Ezren', ancestry: humanAncestryId }));
    expect(unseeded.status).toBe(422);
    const problem = (await unseeded.json()) as Problem;
    expect(problem.message).toStrictEqual({ key: 'problem.validation' });

    await seedOfficialContent(database.db, clock, ignore);

    const created = await api.handle(request('/characters', { name: 'Ezren', ancestry: humanAncestryId }));
    expect(created.status).toBe(200);
    expect(((await created.json()) as { ancestry: string }).ancestry).toBe(humanAncestryId);
  });

  test('a Pathbuilder import resolves its ancestry against the seeded packs', async () => {
    await seedOfficialContent(database.db, clock, ignore);

    const response = await api.handle(request('/characters/import/pathbuilder', mordredExport));

    expect(response.status).toBe(200);
    const { character } = (await response.json()) as { character: { ancestry: string } };
    expect(character.ancestry).toBe(humanAncestryId);
  });
});
