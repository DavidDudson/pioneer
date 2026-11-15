import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import type { CompanionWriteContext } from '@pioneer/character/application';
import {
  CharacterCommand,
  CompanionArchiveReason,
  CompanionForm,
  CompanionId,
  CompanionName,
} from '@pioneer/character/domain';
import type { Character, Companion } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { DrizzleCharacterCompanionRepository, DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { CompanionKind, SlotKey } from '@pioneer/rules/sdk';
import { ConflictError, fixedClock, newId, nextVersion, UserId, VersionConflictError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-11-15T10:00:00Z');
const at = clock.now().toString();
const PIP = CompanionName.parse('Pip');
const MOTH = CompanionName.parse('Moth');

function familiar(name: CompanionName): Companion {
  return {
    id: CompanionId.parse(newId()),
    kind: CompanionKind.Familiar,
    name,
    form: CompanionForm.parse({}),
    grantedBy: SlotKey.parse('witch-lesson:0'),
    createdAt: clock.now(),
    archived: undefined,
  };
}

describe.skipIf(adminUrl === undefined)('character companions over postgres', () => {
  const amiri = UserId.parse(newId());
  let database: TestDatabase;
  let repository: DrizzleCharacterCompanionRepository;
  let characters: DrizzleCharacterRepository;
  let kyra: Character;
  /** The character's id comes from its name, so each test names its own. */
  let characterCount = 0;

  async function version(): Promise<CompanionWriteContext['expectedVersion']> {
    const current = await characters.findById(kyra.id);
    return current?.version ?? kyra.version;
  }

  async function context(): Promise<CompanionWriteContext> {
    return { actor: amiri, characterId: kyra.id, expectedVersion: await version(), at: clock.now() };
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${amiri}, 'User', false, ${at}, ${at})`,
    );
    repository = new DrizzleCharacterCompanionRepository(database.db);
    characters = new DrizzleCharacterRepository(database.db);
  });

  // Rows are archived, never deleted, so each test gets a character of its own.
  beforeEach(async () => {
    kyra = new CharacterBuilder()
      .named(`Kyra ${(characterCount += 1)}`)
      .ownedBy(amiri)
      .build();
    kyra = await characters.insert(kyra, { actor: amiri, command: CharacterCommand.CreateCharacter });
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a character without a familiar and one with exactly one both round-trip', async () => {
    expect(await repository.listForCharacter(kyra.id)).toStrictEqual([]);
    const pip = familiar(PIP);
    await repository.add(await context(), pip);
    expect(await repository.listForCharacter(kyra.id)).toStrictEqual([pip]);
  });

  test('a write bumps the character’s version, and a stale one rolls the whole write back', async () => {
    const stale = await context();
    await repository.add(stale, familiar(PIP));
    expect(await version()).toBe(nextVersion(stale.expectedVersion));

    const refused = await rejection(repository.add(stale, familiar(MOTH)));
    expect(refused).toBeInstanceOf(VersionConflictError);
    expect(await repository.listForCharacter(kyra.id)).toHaveLength(1);
  });

  test('one live familiar per character: a second is refused with nothing written', async () => {
    await repository.add(await context(), familiar(PIP));
    const before = await version();
    const second = await context();
    const refused = await rejection(repository.add(second, familiar(MOTH)));
    expect(refused).toBeInstanceOf(ConflictError);
    expect(await version()).toBe(before);
    expect(await repository.listForCharacter(kyra.id)).toHaveLength(1);
  });

  test('archiving keeps the row and frees the place; restore is refused while another is live', async () => {
    const pip = familiar(PIP);
    await repository.add(await context(), pip);
    await repository.archive(await context(), { id: pip.id, reason: CompanionArchiveReason.Replaced });
    await repository.add(await context(), familiar(MOTH));

    const rows = await repository.listForCharacter(kyra.id);
    expect(rows.map((row) => row.name)).toStrictEqual([MOTH, PIP]);
    expect(rows.map((row) => row.archived?.reason)).toStrictEqual([undefined, CompanionArchiveReason.Replaced]);
    const refused = await rejection(repository.restore(await context(), pip.id));
    expect(refused).toBeInstanceOf(ConflictError);
  });

  test('restore brings an archived familiar back once the place is free', async () => {
    const pip = familiar(PIP);
    await repository.add(await context(), pip);
    await repository.archive(await context(), { id: pip.id, reason: CompanionArchiveReason.Released });
    await repository.restore(await context(), pip.id);
    const rows = await repository.listForCharacter(kyra.id);
    expect(rows.map((row) => row.archived)).toStrictEqual([undefined]);
  });

  test('only the character’s own companion can be archived through it', async () => {
    const pip = familiar(PIP);
    await repository.add(await context(), pip);
    const seelah = await characters.insert(new CharacterBuilder().named('Seelah').ownedBy(amiri).build(), {
      actor: amiri,
      command: CharacterCommand.CreateCharacter,
    });
    await repository.archive(
      { actor: amiri, characterId: seelah.id, expectedVersion: seelah.version, at: clock.now() },
      { id: pip.id, reason: CompanionArchiveReason.Released },
    );
    const rows = await repository.listForCharacter(kyra.id);
    expect(rows.map((row) => row.archived)).toStrictEqual([undefined]);
  });

  test('a stale version refuses archive and restore alike, leaving the row as it was', async () => {
    const pip = familiar(PIP);
    await repository.add(await context(), pip);
    const stale = await context();
    await repository.archive(await context(), { id: pip.id, reason: CompanionArchiveReason.Released });

    const archiveRefused = await rejection(
      repository.archive(stale, { id: pip.id, reason: CompanionArchiveReason.Replaced }),
    );
    const restoreRefused = await rejection(repository.restore(stale, pip.id));
    expect(archiveRefused).toBeInstanceOf(VersionConflictError);
    expect(restoreRefused).toBeInstanceOf(VersionConflictError);
    const rows = await repository.listForCharacter(kyra.id);
    expect(rows.map((row) => row.archived?.reason)).toStrictEqual([CompanionArchiveReason.Released]);
  });

  test('only the character’s own companion can be restored through it', async () => {
    const pip = familiar(PIP);
    await repository.add(await context(), pip);
    await repository.archive(await context(), { id: pip.id, reason: CompanionArchiveReason.Released });
    const seelah = await characters.insert(new CharacterBuilder().named('Seelah the restorer').ownedBy(amiri).build(), {
      actor: amiri,
      command: CharacterCommand.CreateCharacter,
    });
    await repository.restore(
      { actor: amiri, characterId: seelah.id, expectedVersion: seelah.version, at: clock.now() },
      pip.id,
    );
    const rows = await repository.listForCharacter(kyra.id);
    expect(rows.map((row) => row.archived?.reason)).toStrictEqual([CompanionArchiveReason.Released]);
  });

  test('the database refuses to delete a companion (ADR-0062)', async () => {
    await repository.add(await context(), familiar(PIP));
    const error = await rejection(
      database.db.$client.unsafe(`delete from character_companions where character_id = '${kyra.id}'`),
    );
    expect(error).toBeInstanceOf(Error);
  });
});
