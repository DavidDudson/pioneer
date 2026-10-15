import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterName,
  CharacterPatchField,
  ConditionInstanceId,
  ConditionRounds,
  Doomed,
  Dying,
  EffectAllyName,
  EffectBadgeValue,
  EffectInstanceId,
  EffectRounds,
  FRESH_PLAY,
  Resource,
  ResourceCount,
  Wounded,
} from '@pioneer/character/domain';
import type { Character, PlayState } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { ConditionValue, ContentId, HitPoints } from '@pioneer/rules/sdk';
import { FIRST_VERSION, fixedClock, newId, nextVersion, UserId, VersionConflictError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { auditLog } from '@pioneer/shared/server';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { characterPlay, characters } from './character.table';
import { DrizzleCharacterRepository } from './drizzle-character-repository';

/** Runs against a throwaway Postgres database (see createTestDatabase); skipped without TEST_DATABASE_URL. */
const adminUrl = testDatabaseUrl();
const NOW = fixedClock('2026-10-13T10:00:00Z').now();

const WOUNDED: PlayState = {
  ...FRESH_PLAY,
  hp: { damage: HitPoints.parse(5), temp: HitPoints.parse(2) },
  dying: Dying.parse(2),
  wounded: Wounded.parse(1),
  doomed: Doomed.parse(1),
  resources: { ...FRESH_PLAY.resources, [Resource.HeroPoints]: ResourceCount.parse(2) },
  conditions: [
    {
      id: ConditionInstanceId.parse('00000000-0000-4000-8000-000000000001'),
      condition: ContentId.parse('00000000-0000-4000-8000-0000000000f1'),
      value: ConditionValue.parse(2),
      duration: { kind: 'rounds', rounds: ConditionRounds.parse(3) },
    },
  ],
  effects: [
    {
      id: EffectInstanceId.parse('00000000-0000-4000-8000-000000000011'),
      effect: ContentId.parse('00000000-0000-4000-8000-0000000000e1'),
      source: { kind: 'ally', name: EffectAllyName.parse('Seoni') },
      remaining: EffectRounds.parse(60),
      expiry: 'turn-start',
      badge: EffectBadgeValue.parse(2),
    },
  ],
};

describe.skipIf(adminUrl === undefined)('character play state (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;
  let repository: DrizzleCharacterRepository;
  let created = 0;

  /** A fresh user, written as SQL: identity's tables are outside this context's boundary. */
  async function newUser(): Promise<UserId> {
    const id = UserId.parse(newId());
    const at = NOW.toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${id}, 'Owner', false, ${at}, ${at})`,
    );
    return id;
  }

  /** A fresh character, inserted; the builder derives the id from the name, so each gets its own. */
  async function newCharacter(owner: UserId): Promise<Character> {
    created += 1;
    const character = new CharacterBuilder().named(`Kyra ${created}`).ownedBy(owner).build();
    return repository.insert(character, { actor: owner, command: CharacterCommand.CreateCharacter });
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    repository = new DrizzleCharacterRepository(database.db);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a new character has its play row, fresh, at the first revision', async () => {
    const amiri = await newUser();
    const kyra = await newCharacter(amiri);
    expect(await repository.findPlay(kyra.id)).toStrictEqual({ revision: FIRST_VERSION, play: FRESH_PLAY });
    const read = await repository.findById(kyra.id);
    expect(read?.document.play).toStrictEqual(FRESH_PLAY);
  });

  test('a play write bumps the play revision only, is read into the document, and is audited by command', async () => {
    const amiri = await newUser();
    const kyra = await newCharacter(amiri);
    const audit = { actor: amiri, command: CharacterCommand.Damage };
    const saved = await repository.updatePlay({
      id: kyra.id,
      play: WOUNDED,
      expectedRevision: FIRST_VERSION,
      audit,
      now: NOW,
    });
    expect(saved).toStrictEqual({ revision: nextVersion(FIRST_VERSION), play: WOUNDED });

    const read = await repository.findById(kyra.id);
    expect(read?.version).toBe(kyra.version);
    expect(read?.document.play).toStrictEqual(WOUNDED);
    const [listed] = await repository.listForOwner(amiri, { sort: 'name', direction: 'asc' });
    expect(listed?.document.play).toStrictEqual(WOUNDED);

    const playRow = database.db
      .select({ id: characterPlay.id })
      .from(characterPlay)
      .where(eq(characterPlay.characterId, kyra.id));
    // Ordered here, not by the query: the audit log has no index to sort by, and the query plan guard would flag it.
    const entries = await database.db
      .select({ command: auditLog.command, changedAt: auditLog.changedAt })
      .from(auditLog)
      .where(and(eq(auditLog.tableName, 'character_play'), inArray(auditLog.rowId, playRow)));
    const commands = entries.toSorted((left, right) => left.changedAt.localeCompare(right.changedAt));
    expect(commands.map(({ command }) => command)).toStrictEqual([
      CharacterCommand.CreateCharacter,
      CharacterCommand.Damage,
    ]);
  });

  test('a build save leaves play state alone and never writes it into the document', async () => {
    const amiri = await newUser();
    const kyra = await newCharacter(amiri);
    await repository.updatePlay({
      id: kyra.id,
      play: WOUNDED,
      expectedRevision: FIRST_VERSION,
      audit: { actor: amiri, command: CharacterCommand.Damage },
      now: NOW,
    });
    const renamed = kyra.apply({ field: 'name', value: CharacterName.parse('Kyra the Bold') }, NOW);
    const saved = await repository.update(renamed, kyra.version, {
      actor: amiri,
      command: CharacterCommand.RenameCharacter,
    });
    expect(saved.document.play).toStrictEqual(WOUNDED);
    expect(await repository.findPlay(kyra.id)).toStrictEqual({ revision: nextVersion(FIRST_VERSION), play: WOUNDED });
    const [stored] = await database.db
      .select({ document: characters.document })
      .from(characters)
      .where(eq(characters.id, kyra.id));
    expect(stored?.document).not.toHaveProperty('play');
  });

  test('a stale play revision is a conflict, and nothing is written', async () => {
    const amiri = await newUser();
    const kyra = await newCharacter(amiri);
    const write = {
      id: kyra.id,
      expectedRevision: FIRST_VERSION,
      audit: { actor: amiri, command: CharacterCommand.Damage },
      now: NOW,
    };
    await repository.updatePlay({ ...write, play: WOUNDED });
    const stale = await rejection(repository.updatePlay({ ...write, play: FRESH_PLAY }));
    expect(stale).toBeInstanceOf(VersionConflictError);
    const kept = await repository.findPlay(kyra.id);
    expect(kept?.play).toStrictEqual(WOUNDED);
  });

  test('a play write with a build write changes both rows under one audit stamp', async () => {
    const amiri = await newUser();
    const kyra = await newCharacter(amiri);
    const renamed = kyra.apply({ field: CharacterPatchField.Name, value: CharacterName.parse('Kyra, renamed') }, NOW);
    const write = {
      id: kyra.id,
      play: WOUNDED,
      expectedRevision: FIRST_VERSION,
      audit: { actor: amiri, command: CharacterCommand.OverchargeWand },
      now: NOW,
    };
    const saved = await repository.updatePlayAndCharacter(write, renamed, kyra.version);
    expect(saved).toStrictEqual({ revision: nextVersion(FIRST_VERSION), play: WOUNDED });
    const read = await repository.findById(kyra.id);
    expect(read?.name).toBe(renamed.name);
    expect(read?.version).toBe(nextVersion(kyra.version));
    expect(read?.document.play).toStrictEqual(WOUNDED);
  });

  test('a stale build version refuses a combined write, and the play state is not written', async () => {
    const amiri = await newUser();
    const kyra = await newCharacter(amiri);
    const write = {
      id: kyra.id,
      play: WOUNDED,
      expectedRevision: FIRST_VERSION,
      audit: { actor: amiri, command: CharacterCommand.OverchargeWand },
      now: NOW,
    };
    const stale = await rejection(repository.updatePlayAndCharacter(write, kyra, nextVersion(kyra.version)));
    expect(stale).toBeInstanceOf(VersionConflictError);
    const kept = await repository.findPlay(kyra.id);
    expect(kept?.play).toStrictEqual(FRESH_PLAY);
  });

  test('a stale play revision refuses a combined write, and the build is not written', async () => {
    const amiri = await newUser();
    const kyra = await newCharacter(amiri);
    const renamed = kyra.apply({ field: CharacterPatchField.Name, value: CharacterName.parse('Kyra, stale') }, NOW);
    const write = {
      id: kyra.id,
      play: WOUNDED,
      expectedRevision: nextVersion(FIRST_VERSION),
      audit: { actor: amiri, command: CharacterCommand.OverchargeWand },
      now: NOW,
    };
    const stale = await rejection(repository.updatePlayAndCharacter(write, renamed, kyra.version));
    expect(stale).toBeInstanceOf(VersionConflictError);
    const read = await repository.findById(kyra.id);
    expect(read?.name).toBe(kyra.name);
    expect(read?.version).toBe(kyra.version);
  });

  test('a character cannot be deleted, so its play row stays', async () => {
    const amiri = await newUser();
    const kyra = await newCharacter(amiri);
    const refused = await rejection(database.db.execute(sql`delete from characters where id = ${kyra.id}`));
    expect(refused).toBeInstanceOf(Error);
    const kept = await repository.findPlay(kyra.id);
    expect(kept).toBeDefined();
  });

  test('every query the repository issued is served by an index', async () => {
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
