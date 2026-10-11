import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CharacterService } from '@pioneer/character/application';
import { ANCESTRY_SLOT, CharacterCommand, CharacterName, CharacterPatchField } from '@pioneer/character/domain';
import { fixtureOwnerId, humanAncestryId } from '@pioneer/character/domain/testing';
import { ChoiceValue, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock, newId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { auditLog } from '@pioneer/shared/server';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { asc, eq, sql } from 'drizzle-orm';

import { DrizzleCharacterRepository } from './drizzle-character-repository';

/** Slot edits against a throwaway Postgres database; skipped when TEST_DATABASE_URL is unset. */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-07T10:00:00Z');
const elf = ChoiceValue.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:elf')));

describe.skipIf(adminUrl === undefined)('selectSlot and clearSlot (postgres)', () => {
  let database: TestDatabase;
  let service: CharacterService;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    const at = clock.now().toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${fixtureOwnerId}, 'Owner', false, ${at}, ${at})`,
    );
    const pack = new ContentPackBuilder().withId('player-core').withAncestry('human').withAncestry('elf').build();
    service = new CharacterService(new DrizzleCharacterRepository(database.db), fixedContent(pack), clock);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('each slot edit is one audited write, named by its command', async () => {
    const created = await service.create(fixtureOwnerId, {
      name: CharacterName.parse('Merisiel'),
      ancestry: humanAncestryId,
    });
    const selected = await service.patch(fixtureOwnerId, created.id, {
      expectedVersion: FIRST_VERSION,
      patch: { field: CharacterPatchField.SelectSlot, slot: ANCESTRY_SLOT, selection: elf },
    });
    await service.patch(fixtureOwnerId, created.id, {
      expectedVersion: selected.version,
      patch: { field: CharacterPatchField.ClearSlot, slot: ANCESTRY_SLOT },
    });
    const entries = await database.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.rowId, created.id))
      .orderBy(asc(auditLog.changedAt));
    expect(entries.map((entry) => [entry.action, entry.rowVersion, entry.command])).toStrictEqual([
      ['insert', 1, CharacterCommand.CreateCharacter],
      ['update', 2, CharacterCommand.SelectSlot],
      ['update', 3, CharacterCommand.ClearSlot],
    ]);
    const stored = await service.get(fixtureOwnerId, created.id);
    expect(stored.ancestry).toBeUndefined();
  });

  test('a refused selection writes nothing', async () => {
    const created = await service.create(fixtureOwnerId, {
      name: CharacterName.parse('Kyra'),
      ancestry: humanAncestryId,
    });
    const unknown = ChoiceValue.parse(newId());
    await rejection(
      service.patch(fixtureOwnerId, created.id, {
        expectedVersion: FIRST_VERSION,
        patch: { field: CharacterPatchField.SelectSlot, slot: ANCESTRY_SLOT, selection: unknown },
      }),
    );
    const entries = await database.db.select().from(auditLog).where(eq(auditLog.rowId, created.id));
    expect(entries).toHaveLength(1);
  });
});
