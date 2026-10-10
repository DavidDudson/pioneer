import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CharacterId, PartyCharacterLevel, PartyCharacterName } from '@pioneer/campaign/domain';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { OwnedCharacterDirectory } from './owned-character-directory';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const at = fixedClock('2026-10-10T10:00:00Z').now().toString();

/** The columns a test sets on a characters row. */
interface CharacterRow {
  readonly id: CharacterId;
  readonly ownerId: UserId;
  readonly name: string;
  readonly level: number;
}

describe.skipIf(adminUrl === undefined)('OwnedCharacterDirectory (postgres)', () => {
  const recorder = new QueryRecorder();
  const ezren = UserId.parse(newId());
  const seelah = UserId.parse(newId());
  const valeros = CharacterId.parse(newId());
  const merisiel = CharacterId.parse(newId());
  const kyra = CharacterId.parse(newId());
  let database: TestDatabase;

  async function insertCharacter({ id, ownerId, name, level }: CharacterRow): Promise<void> {
    await database.db.execute(
      sql`insert into characters (id, version, owner_id, name, ancestry, level, attributes, created_at, updated_at) values (${id}, 1, ${ownerId}, ${name}, ${newId()}, ${level}, '{}'::jsonb, ${at}, ${at})`,
    );
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${ezren}, 'Ezren', false, ${at}, ${at}), (${seelah}, 'Seelah', false, ${at}, ${at})`,
    );
    await insertCharacter({ id: valeros, ownerId: ezren, name: 'Valeros', level: 3 });
    await insertCharacter({ id: merisiel, ownerId: ezren, name: 'Merisiel', level: 1 });
    await insertCharacter({ id: kyra, ownerId: seelah, name: 'Kyra', level: 2 });
  });

  afterAll(async () => {
    await database.drop();
  });

  test('lists a user’s characters by name', async () => {
    const directory = new OwnedCharacterDirectory(database.db);
    const owned = await directory.ownedBy(ezren);
    expect(owned).toStrictEqual([
      { id: merisiel, ownerId: ezren, name: PartyCharacterName.parse('Merisiel'), level: PartyCharacterLevel.parse(1) },
      { id: valeros, ownerId: ezren, name: PartyCharacterName.parse('Valeros'), level: PartyCharacterLevel.parse(3) },
    ]);
    const nobody = UserId.parse(newId());
    expect(await directory.ownedBy(nobody)).toStrictEqual([]);
  });

  test('finds characters by id whoever owns them and leaves out the rest', async () => {
    const directory = new OwnedCharacterDirectory(database.db);
    const found = await directory.byIds([kyra, valeros, CharacterId.parse(newId())]);
    const ids = [...found.keys()];
    expect(ids.toSorted()).toStrictEqual([kyra, valeros].toSorted());
    expect(found.get(kyra)?.ownerId).toBe(seelah);
    expect(await directory.byIds([])).toStrictEqual(new Map());
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
