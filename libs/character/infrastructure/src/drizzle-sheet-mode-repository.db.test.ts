import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CharacterCommand, SheetMode } from '@pioneer/character/domain';
import type { CharacterId } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { fixedClock, newId, Temporal, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, sql } from 'drizzle-orm';

import { characterSheetModes } from './character.table';
import { DrizzleCharacterRepository } from './drizzle-character-repository';
import { DrizzleSheetModeRepository } from './drizzle-sheet-mode-repository';

/** Runs against a throwaway Postgres database (see createTestDatabase); skipped without TEST_DATABASE_URL. */
const adminUrl = testDatabaseUrl();
const NOW = fixedClock('2026-10-12T10:00:00Z').now();
const LATER = NOW.add({ minutes: 1 });

describe.skipIf(adminUrl === undefined)('DrizzleSheetModeRepository (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;
  let modes: DrizzleSheetModeRepository;

  /** A fresh user, written as SQL: identity's tables are outside this context's boundary. */
  async function newUser(): Promise<UserId> {
    const id = UserId.parse(newId());
    const at = NOW.toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${id}, 'Owner', false, ${at}, ${at})`,
    );
    return id;
  }

  let created = 0;

  /** A fresh character owned by `owner`; the builder derives the id from the name, so each gets its own. */
  async function newCharacter(owner: UserId): Promise<CharacterId> {
    created += 1;
    const character = new CharacterBuilder().named(`Kyra ${created}`).ownedBy(owner).build();
    await new DrizzleCharacterRepository(database.db).insert(character, {
      actor: owner,
      command: CharacterCommand.CreateCharacter,
    });
    return character.id;
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    modes = new DrizzleSheetModeRepository(database.db);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a character whose tab was never switched has none', async () => {
    const amiri = await newUser();
    const kyra = await newCharacter(amiri);
    expect(await modes.findFor({ userId: amiri, characterId: kyra })).toBeUndefined();
  });

  test('a later switch replaces the earlier one in the same row and stamps the time', async () => {
    const amiri = await newUser();
    const kyra = { userId: amiri, characterId: await newCharacter(amiri) };
    await modes.save(kyra, SheetMode.Encounter, NOW);
    await modes.save(kyra, SheetMode.Downtime, LATER);
    expect(await modes.findFor(kyra)).toBe(SheetMode.Downtime);

    const rows = await database.db
      .select({ updatedAt: characterSheetModes.updatedAt })
      .from(characterSheetModes)
      .where(eq(characterSheetModes.characterId, kyra.characterId));
    const stamped = rows.map((row) => Temporal.Instant.from(row.updatedAt).epochMilliseconds);
    expect(stamped).toStrictEqual([LATER.epochMilliseconds]);
  });

  test('each user and character has its own tab', async () => {
    const amiri = await newUser();
    const ezren = await newUser();
    const kyra = await newCharacter(amiri);
    const seelah = await newCharacter(amiri);
    await modes.save({ userId: amiri, characterId: kyra }, SheetMode.Exploration, NOW);
    expect(await modes.findFor({ userId: amiri, characterId: seelah })).toBeUndefined();
    expect(await modes.findFor({ userId: ezren, characterId: kyra })).toBeUndefined();
  });

  test('a tab needs an existing user', async () => {
    const amiri = await newUser();
    const nobody = { userId: UserId.parse(newId()), characterId: await newCharacter(amiri) };
    expect(await rejection(modes.save(nobody, SheetMode.Plan, NOW))).toBeInstanceOf(Error);
  });

  test('a character cannot be deleted, so its tabs stay; deleting a user deletes theirs', async () => {
    const amiri = await newUser();
    const ezren = await newUser();
    const kyra = await newCharacter(amiri);
    const seelah = await newCharacter(amiri);
    await modes.save({ userId: amiri, characterId: kyra }, SheetMode.Encounter, NOW);
    await modes.save({ userId: ezren, characterId: kyra }, SheetMode.Encounter, NOW);
    await modes.save({ userId: ezren, characterId: seelah }, SheetMode.Encounter, NOW);
    const refused = await rejection(database.db.execute(sql`delete from characters where id = ${kyra}`));
    expect(refused).toBeInstanceOf(Error);
    const onKyra = await database.db
      .select()
      .from(characterSheetModes)
      .where(eq(characterSheetModes.characterId, kyra));
    expect(onKyra).toHaveLength(2);

    await database.db.execute(sql`delete from users where id = ${ezren}`);
    expect(await modes.findFor({ userId: ezren, characterId: seelah })).toBeUndefined();
  });

  test('every query the repository issued is served by an index', async () => {
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
