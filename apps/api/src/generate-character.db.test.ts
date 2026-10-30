import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { GeneratedCharacter, Seed } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { fixtureOwnerId } from '@pioneer/character/domain/testing';
import { Level } from '@pioneer/rules/sdk';
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

/** Time to seed every official pack and generate characters on a shared runner. */
const SETUP_TIMEOUT_MS = 60_000;
const SEED = Seed.parse(4242);
const LEVEL = Level.parse(3);

const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-27T10:00:00Z');

function post(path: string, body: unknown, headers: Record<string, string> = actingAs(fixtureOwnerId)): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

/** What the character holds, without the line ids, which come from the character's own id. */
function heldItems(character: Character): readonly string[] {
  return character.document.inventory.items.map((line) => `${line.item}x${line.quantity}`).toSorted();
}

/** One generate request at the test seed and level, read back. */
async function generate(api: AnyElysia): Promise<GeneratedCharacter> {
  const response = await api.handle(post('/characters/generate', { level: LEVEL, seed: SEED }));
  return GeneratedCharacter.parse(await response.json());
}

function ignore(): void {
  // Seed log lines are not under test.
}

describe.skipIf(adminUrl === undefined)('POST /characters/generate (postgres)', () => {
  let database: TestDatabase;
  let api: AnyElysia;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    const at = clock.now().toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${fixtureOwnerId}, 'Owner', false, ${at}, ${at})`,
    );
    await seedOfficialContent(database.db, clock, ignore);
    api = new Elysia().use(problemHandler).use(characters(database.db, clock, new FakeAuthenticator()).routes);
  }, SETUP_TIMEOUT_MS);

  afterAll(async () => {
    await database.drop();
  });

  test(
    'makes a stored character for the signed-in user and answers with its seed',
    async () => {
      const response = await api.handle(post('/characters/generate', { level: LEVEL, seed: SEED }));
      expect(response.status).toBe(200);
      const generated = GeneratedCharacter.parse(await response.json());
      expect(generated.seed).toBe(SEED);
      expect(generated.character.level).toBe(LEVEL);
      expect(generated.character.ownerId).toBe(fixtureOwnerId);
    },
    SETUP_TIMEOUT_MS,
  );

  test(
    'the same seed and level give the same character',
    async () => {
      const first = await generate(api);
      const second = await generate(api);
      expect(second.character.document.build).toEqual(first.character.document.build);
      expect(second.character.document.name).toBe(first.character.document.name);
      expect(second.character.document.personality).toEqual(first.character.document.personality);
      expect(heldItems(second.character)).toEqual(heldItems(first.character));
    },
    SETUP_TIMEOUT_MS,
  );

  test('a level out of range is a typed validation problem', async () => {
    const response = await api.handle(post('/characters/generate', { level: 21 }));
    expect(response.status).toBe(422);
    const problem = (await response.json()) as Problem;
    expect(problem.type).toBe('validation');
  });

  test('needs a signed-in user', async () => {
    const response = await api.handle(post('/characters/generate', { level: 1 }, {}));
    expect(response.status).toBe(401);
  });
});
