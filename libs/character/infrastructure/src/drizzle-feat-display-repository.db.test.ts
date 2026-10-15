import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CharacterCommand, FeatDisplaySection } from '@pioneer/character/domain';
import type { CharacterId } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { fixedClock, newId, Temporal, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, sql } from 'drizzle-orm';

import { characterFeatDisplays } from './character.table';
import { DrizzleCharacterRepository } from './drizzle-character-repository';
import { DrizzleFeatDisplayRepository } from './drizzle-feat-display-repository';

/** Runs against a throwaway Postgres database (see createTestDatabase); skipped without TEST_DATABASE_URL. */
const adminUrl = testDatabaseUrl();
const NOW = fixedClock('2026-10-13T10:00:00Z').now();
const LATER = NOW.add({ minutes: 1 });
const SHOW = { section: FeatDisplaySection.Feats, showGrantOnly: true };
const HIDE = { section: FeatDisplaySection.Feats, showGrantOnly: false };

describe.skipIf(adminUrl === undefined)('DrizzleFeatDisplayRepository (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;
  let display: DrizzleFeatDisplayRepository;

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
    display = new DrizzleFeatDisplayRepository(database.db);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a character whose filter was never set shows none', async () => {
    const amiri = await newUser();
    const kyra = await newCharacter(amiri);
    expect(await display.findShown({ userId: amiri, characterId: kyra })).toStrictEqual([]);
  });

  test('a later choice replaces the earlier one in the same row and stamps the time', async () => {
    const amiri = await newUser();
    const kyra = { userId: amiri, characterId: await newCharacter(amiri) };
    await display.save(kyra, SHOW, NOW);
    expect(await display.findShown(kyra)).toStrictEqual([FeatDisplaySection.Feats]);
    await display.save(kyra, HIDE, LATER);
    expect(await display.findShown(kyra)).toStrictEqual([]);

    const rows = await database.db
      .select({ updatedAt: characterFeatDisplays.updatedAt })
      .from(characterFeatDisplays)
      .where(eq(characterFeatDisplays.characterId, kyra.characterId));
    const stamped = rows.map((row) => Temporal.Instant.from(row.updatedAt).epochMilliseconds);
    expect(stamped).toStrictEqual([LATER.epochMilliseconds]);
  });

  test('each user and character has its own filter', async () => {
    const amiri = await newUser();
    const ezren = await newUser();
    const kyra = await newCharacter(amiri);
    const seelah = await newCharacter(amiri);
    await display.save({ userId: amiri, characterId: kyra }, SHOW, NOW);
    expect(await display.findShown({ userId: amiri, characterId: seelah })).toStrictEqual([]);
    expect(await display.findShown({ userId: ezren, characterId: kyra })).toStrictEqual([]);
  });

  test('a filter needs an existing user', async () => {
    const amiri = await newUser();
    const nobody = { userId: UserId.parse(newId()), characterId: await newCharacter(amiri) };
    expect(await rejection(display.save(nobody, SHOW, NOW))).toBeInstanceOf(Error);
  });

  test('a character cannot be deleted, so its filters stay; deleting a user deletes theirs', async () => {
    const amiri = await newUser();
    const ezren = await newUser();
    const kyra = await newCharacter(amiri);
    const seelah = await newCharacter(amiri);
    await display.save({ userId: amiri, characterId: kyra }, SHOW, NOW);
    await display.save({ userId: ezren, characterId: kyra }, SHOW, NOW);
    await display.save({ userId: ezren, characterId: seelah }, SHOW, NOW);
    const refused = await rejection(database.db.execute(sql`delete from characters where id = ${kyra}`));
    expect(refused).toBeInstanceOf(Error);
    const onKyra = await database.db
      .select()
      .from(characterFeatDisplays)
      .where(eq(characterFeatDisplays.characterId, kyra));
    expect(onKyra).toHaveLength(2);

    await database.db.execute(sql`delete from users where id = ${ezren}`);
    expect(await display.findShown({ userId: ezren, characterId: seelah })).toStrictEqual([]);
  });

  test('every query the repository issued is served by an index', async () => {
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
