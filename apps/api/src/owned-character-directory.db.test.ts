import { afterAll, beforeAll, describe, expect, spyOn, test } from 'bun:test';

import { CharacterId, PartyCharacterLevel, PartyCharacterName, PartyCharacterOrigin } from '@pioneer/campaign/domain';
import { CharacterVitals } from '@pioneer/character/application';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { OwnedCharacterDirectory } from './owned-character-directory';

/** Content with no Hit Points statistic, so no character has a maximum. */
const vitals = new CharacterVitals(fixedContent(new ContentPackBuilder().withId('player-core').build()));

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const at = fixedClock('2026-10-10T10:00:00Z').now().toString();

/** The columns a test sets on a characters row. */
interface CharacterRow {
  readonly id: CharacterId;
  readonly ownerId: UserId;
  readonly name: string;
  readonly level: number;
  readonly choices?: Readonly<Record<string, string>>;
}

describe.skipIf(adminUrl === undefined)('OwnedCharacterDirectory (postgres)', () => {
  const recorder = new QueryRecorder();
  const ezren = UserId.parse(newId());
  const seelah = UserId.parse(newId());
  const valeros = CharacterId.parse(newId());
  const merisiel = CharacterId.parse(newId());
  const kyra = CharacterId.parse(newId());
  let database: TestDatabase;

  async function insertCharacter({ id, ownerId, name, level, choices }: CharacterRow): Promise<void> {
    await database.db.execute(
      sql`insert into characters (id, version, owner_id, name, level, schema_version, document, created_at, updated_at) values (${id}, 1, ${ownerId}, ${name}, ${level}, 1, ${JSON.stringify({ schemaVersion: 1, id, ownerId, name, level, build: { choices: choices ?? {} } })}::text::jsonb, ${at}, ${at})`,
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
    const directory = new OwnedCharacterDirectory(database.db, vitals);
    const owned = await directory.ownedBy(ezren);
    expect(owned).toStrictEqual([
      {
        id: merisiel,
        ownerId: ezren,
        name: PartyCharacterName.parse('Merisiel'),
        level: PartyCharacterLevel.parse(1),
        archived: false,
      },
      {
        id: valeros,
        ownerId: ezren,
        name: PartyCharacterName.parse('Valeros'),
        level: PartyCharacterLevel.parse(3),
        archived: false,
      },
    ]);
    const nobody = UserId.parse(newId());
    expect(await directory.ownedBy(nobody)).toStrictEqual([]);
  });

  test('carries the ancestry and class the build picked, and leaves out an empty slot', async () => {
    const human = PartyCharacterOrigin.parse(newId());
    const fighter = PartyCharacterOrigin.parse(newId());
    const picked = CharacterId.parse(newId());
    const owner = UserId.parse(newId());
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${owner}, 'Lini', false, ${at}, ${at})`,
    );
    await insertCharacter({
      id: picked,
      ownerId: owner,
      name: 'Harsk',
      level: 2,
      choices: { ancestry: human, class: fighter },
    });
    await insertCharacter({
      id: CharacterId.parse(newId()),
      ownerId: owner,
      name: 'Zed',
      level: 1,
      choices: { ancestry: human },
    });
    const owned = await new OwnedCharacterDirectory(database.db, vitals).ownedBy(owner);
    expect(
      owned.map((character) => ({ name: character.name, ancestry: character.ancestry, class: character.class })),
    ).toStrictEqual([
      { name: PartyCharacterName.parse('Harsk'), ancestry: human, class: fighter },
      { name: PartyCharacterName.parse('Zed'), ancestry: human, class: undefined },
    ]);
  });
  test('an archived character is not listed as owned but is found by id, flagged', async () => {
    const archived = CharacterId.parse(newId());
    await insertCharacter({ id: archived, ownerId: seelah, name: 'Old Kyra', level: 5 });
    await database.db.execute(sql`update characters set archived_at = ${at} where id = ${archived}`);
    const directory = new OwnedCharacterDirectory(database.db, vitals);
    const owned = await directory.ownedBy(seelah);
    expect(owned.map((character) => character.id)).not.toContain(archived);
    const found = await directory.byIds([archived, kyra]);
    expect(found.get(archived)?.archived).toBe(true);
    expect(found.get(kyra)?.archived).toBe(false);
  });

  test('finds characters by id whoever owns them and leaves out the rest', async () => {
    const directory = new OwnedCharacterDirectory(database.db, vitals);
    const found = await directory.byIds([kyra, valeros, CharacterId.parse(newId())]);
    const ids = [...found.keys()];
    expect(ids.toSorted()).toStrictEqual([kyra, valeros].toSorted());
    expect(found.get(kyra)?.ownerId).toBe(seelah);
    expect(await directory.byIds([])).toStrictEqual(new Map());
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });

  test('works out how a character stands from its stored play state and leaves out the rest', async () => {
    const directory = new OwnedCharacterDirectory(database.db, vitals);
    const seen = await directory.vitalsOf([kyra, CharacterId.parse(newId())]);
    expect([...seen.keys()]).toStrictEqual([kyra]);
    expect(seen.get(kyra)).toMatchObject({ dying: 0, conditions: [] });
    expect(seen.get(kyra)?.hp).toBeUndefined();
    expect(await directory.vitalsOf([])).toStrictEqual(new Map());
  });

  test('leaves a character out when its vitals cannot be worked out, and answers for no one without them', async () => {
    const broken = new CharacterVitals(fixedContent(new ContentPackBuilder().withId('player-core').build()));
    spyOn(broken, 'of').mockRejectedValue(new Error('content failed'));
    const seen = await new OwnedCharacterDirectory(database.db, broken).vitalsOf([kyra, valeros]);
    expect(seen).toStrictEqual(new Map());
    expect(await new OwnedCharacterDirectory(database.db).vitalsOf([kyra])).toStrictEqual(new Map());
  });
});
