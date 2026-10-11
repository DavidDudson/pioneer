import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CharacterBuilder, fixtureOwnerId, humanAncestryId } from '@pioneer/character/domain/testing';
import { fixedClock } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';
import { createTestDatabaseBefore, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { PartlyMigratedDatabase, TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { DrizzleCharacterRepository } from './drizzle-character-repository';

/** Migration 0013: content ids stored in character documents move to their kind-prefixed slugs' ids (ADR-0034). */

const adminUrl = testDatabaseUrl();
const later = fixedClock('2026-10-07T10:00:00Z').now();

/** A bare users row, written as SQL: identity's tables are outside this context's boundary. */
async function insertUser(database: TestDatabase, id: UserId): Promise<void> {
  const at = later.toString();
  await database.db.execute(
    sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${id}, 'Owner', false, ${at}, ${at})`,
  );
}

describe.skipIf(adminUrl === undefined)('0013_kind_prefixed_slugs (postgres)', () => {
  let database: PartlyMigratedDatabase;
  const merisiel = new CharacterBuilder().named('Merisiel').atLevel(3).build();
  /** Human's id before slugs named their kind: UUIDv5 of `player-core/human`. */
  const OLD_HUMAN_ID = 'f10cdb85-0c8e-5795-9741-a0f4790f2bf3';

  beforeAll(async () => {
    database = await createTestDatabaseBefore(adminUrl ?? '', '0013_kind_prefixed_slugs');
    await insertUser(database, fixtureOwnerId);
    const at = later.toString();
    const document = {
      schemaVersion: 1,
      id: merisiel.id,
      ownerId: fixtureOwnerId,
      name: 'Merisiel',
      level: 3,
      build: { choices: { ancestry: OLD_HUMAN_ID } },
    };
    await database.db.execute(
      sql`insert into characters (id, version, owner_id, name, level, attributes, schema_version, document, created_at, updated_at) values (${merisiel.id}, 1, ${fixtureOwnerId}, 'Merisiel', 3, '{"str":0,"dex":0,"con":0,"int":0,"wis":0,"cha":0}'::jsonb, 1, ${JSON.stringify(document)}::jsonb, ${at}, ${at})`,
    );
    await database.migrateRest();
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a stored document naming an old content id names the new one', async () => {
    const found = await new DrizzleCharacterRepository(database.db).findById(merisiel.id);
    expect(found?.ancestry).toBe(humanAncestryId);
  });
});
