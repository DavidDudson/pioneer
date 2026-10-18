import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test';

import { Character, CharacterPatchField } from '@pioneer/character/domain';
import { fixtureOwnerId, humanAncestryId } from '@pioneer/character/domain/testing';
import { BugReportService, BugReportTriageService } from '@pioneer/identity/application';
import { UserId } from '@pioneer/identity/domain';
import type { BugReportId, CharacterSnapshot } from '@pioneer/identity/domain';
import { bugReportRoutes, DrizzleBugReportRepository, DrizzleUserRepository } from '@pioneer/identity/infrastructure';
import { fixedClock } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, createTestDatabase, FakeAuthenticator, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { characters } from './characters';
import { seedOfficialContent } from './content';
import { PioneerCharacterSnapshots } from './pioneer-character-snapshots';

/**
 * A bug report's character snapshot as the composition root wires it, against a throwaway Postgres database (see
 * createTestDatabase). Skipped when TEST_DATABASE_URL is unset; CI always sets it.
 */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-16T10:00:00Z');
const STRANGER = UserId.parse('00000000-0000-4000-8000-000000000002');

/** Seeding the official content takes longer than the 5s default. */
setDefaultTimeout(30_000);

function ignore(): void {
  // Seed log lines are not under test.
}

/** A request to the API: `method` and `path`, a JSON `body`, and the user it is sent as. */
interface Call {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
  readonly user?: UserId;
}

function send({ method, path, body, user = fixtureOwnerId }: Call): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...actingAs(user) },
    body: JSON.stringify(body),
  });
}

const REPORT = {
  route: '/characters/amiri',
  appVersion: '1.2.3',
  locale: 'en',
  userAgent: 'Mozilla/5.0',
  description: 'The AC is wrong',
  steps: 'Open the sheet',
};

/** What the API answers a filed report with. */
interface Filed {
  readonly id: BugReportId;
  readonly snapshotTaken: boolean;
}

describe.skipIf(adminUrl === undefined)('bug report character snapshot (postgres)', () => {
  let database: TestDatabase;
  let api: AnyElysia;
  let repository: DrizzleBugReportRepository;

  async function createCharacter(): Promise<Character> {
    const body = { name: 'Ezren', ancestry: humanAncestryId };
    const created = await api.handle(send({ method: 'POST', path: '/characters', body }));
    return Character.codec.parse(await created.json());
  }

  async function report(body: object, user: UserId = fixtureOwnerId): Promise<Filed> {
    const call = {
      method: 'POST',
      path: '/me/bug-reports',
      body: { ...REPORT, ...body },
      user,
    };
    const response = await api.handle(send(call));
    expect(response.status).toBe(200);
    return (await response.json()) as Filed;
  }

  async function storedSnapshot(id: BugReportId): Promise<CharacterSnapshot | undefined> {
    const stored = await repository.findById(id);
    return stored?.snapshot;
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    const at = clock.now().toString();
    await Promise.all(
      [fixtureOwnerId, STRANGER].map(async (id) =>
        database.db.execute(
          sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${id}, 'User', false, ${at}, ${at})`,
        ),
      ),
    );
    await seedOfficialContent(database.db, clock, ignore);
    const auth = new FakeAuthenticator();
    const snapshots = new PioneerCharacterSnapshots();
    const character = characters(database.db, clock, auth);
    snapshots.bind(character.pioneerFiles);
    repository = new DrizzleBugReportRepository(database.db);
    const reports = new BugReportService(repository, snapshots, clock);
    const triage = new BugReportTriageService(repository, new DrizzleUserRepository(database.db));
    api = new Elysia()
      .use(problemHandler)
      .use(character.routes)
      .use(bugReportRoutes(reports, triage, auth));
  });

  afterAll(async () => {
    await database.drop();
  });

  test('later edits to the character do not change the stored snapshot', async () => {
    const ezren = await createCharacter();
    const filed = await report({
      characterId: ezren.id,
      shareCharacter: true,
    });
    expect(filed.snapshotTaken).toBe(true);
    const before = await storedSnapshot(filed.id);
    expect(before).toMatchObject({
      format: 'pioneer-character',
      formatVersion: 1,
    });

    const patch = {
      field: CharacterPatchField.Name,
      value: 'Ezren, renamed',
    };
    const body = { expectedVersion: ezren.version, patch };
    const renamed = await api.handle(send({ method: 'PATCH', path: `/characters/${ezren.id}`, body }));
    expect(renamed.status).toBe(200);

    const after = await storedSnapshot(filed.id);
    expect(after).toStrictEqual(before);
    expect(JSON.stringify(after)).toContain('Ezren');
    expect(JSON.stringify(after)).not.toContain('Ezren, renamed');
  });

  test('a character that is not the reporter’s is filed without a snapshot', async () => {
    const ezren = await createCharacter();
    const filed = await report({ characterId: ezren.id, shareCharacter: true }, STRANGER);
    expect(filed.snapshotTaken).toBe(false);
    expect(await storedSnapshot(filed.id)).toBeUndefined();
  });

  test('an unticked share stores no snapshot', async () => {
    const ezren = await createCharacter();
    const filed = await report({
      characterId: ezren.id,
      shareCharacter: false,
    });
    expect(filed.snapshotTaken).toBe(false);
    expect(await storedSnapshot(filed.id)).toBeUndefined();
  });
});
