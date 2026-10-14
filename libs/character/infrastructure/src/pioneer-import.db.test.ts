import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CharacterService, InMemoryEmbeddedHomebrew, PioneerFileService } from '@pioneer/character/application';
import { CharacterCommand, CharacterName } from '@pioneer/character/domain';
import { fixtureOwnerId, humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { auditLog } from '@pioneer/shared/server';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, sql } from 'drizzle-orm';

import { DrizzleCharacterRepository } from './drizzle-character-repository';

/** A Pioneer file import against a throwaway Postgres database; skipped when TEST_DATABASE_URL is unset. */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-07T10:00:00Z');

describe.skipIf(adminUrl === undefined)('Pioneer file import (postgres)', () => {
  let database: TestDatabase;
  let service: CharacterService;
  let files: PioneerFileService;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    const at = clock.now().toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${fixtureOwnerId}, 'Owner', false, ${at}, ${at})`,
    );
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    const repository = new DrizzleCharacterRepository(database.db);
    service = new CharacterService(repository, content, clock);
    files = new PioneerFileService({ repository, content, clock, homebrew: new InMemoryEmbeddedHomebrew() });
  });

  afterAll(async () => {
    await database.drop();
  });

  test('an exported character imports as a new one, logged as importPioneer, and exports as the same file', async () => {
    const original = await service.create(fixtureOwnerId, {
      name: CharacterName.parse('Kyra'),
      ancestry: humanAncestryId,
    });
    const file = await files.export(fixtureOwnerId, original.id);

    const imported = await files.import(fixtureOwnerId, file);

    expect(imported.id).not.toBe(original.id);
    const entries = await database.db.select().from(auditLog).where(eq(auditLog.rowId, imported.id));
    expect(entries.map((entry) => [entry.action, entry.rowVersion, entry.actorId, entry.command])).toStrictEqual([
      ['insert', 1, fixtureOwnerId, CharacterCommand.ImportPioneer],
    ]);
    expect(await files.export(fixtureOwnerId, imported.id)).toStrictEqual(file);
  });

  test('a refused file writes nothing', async () => {
    const before = await database.db.select().from(auditLog);

    await rejection(files.import(fixtureOwnerId, { hello: 'world' }));

    expect(await database.db.select().from(auditLog)).toHaveLength(before.length);
  });
});
