import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  InventoryItemId,
  ItemAcknowledgementId,
  RuleBreak,
  RuleCount,
} from '@pioneer/character/domain';
import type { Character, ItemAcknowledgement } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import {
  DrizzleCharacterItemAcknowledgementRepository,
  DrizzleCharacterRepository,
} from '@pioneer/character/infrastructure';
import { ContentId } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-11-06T10:00:00Z');
const at = clock.now().toString();

describe.skipIf(adminUrl === undefined)('character item acknowledgements over postgres', () => {
  const recorder = new QueryRecorder();
  const amiri = UserId.parse(newId());
  const rope = InventoryItemId.parse(newId());
  let database: TestDatabase;
  let repository: DrizzleCharacterItemAcknowledgementRepository;
  let kyra: Character;

  /** An acknowledgement of the rope's invested rule, at `value` unless it says otherwise. */
  function acknowledgement(over: Partial<ItemAcknowledgement> = {}): ItemAcknowledgement {
    return {
      id: ItemAcknowledgementId.parse(newId()),
      item: rope,
      rule: RuleBreak.Invested,
      rune: undefined,
      value: RuleCount.parse(11),
      acknowledgedBy: amiri,
      acknowledgedAt: clock.now(),
      ...over,
    };
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${amiri}, 'User', false, ${at}, ${at})`,
    );
    repository = new DrizzleCharacterItemAcknowledgementRepository(database.db);
  });

  // Rows are archived, never deleted, so each test gets a character of its own.
  beforeEach(async () => {
    const characters = new DrizzleCharacterRepository(database.db);
    kyra = new CharacterBuilder().named('Kyra').ownedBy(amiri).build();
    await characters.insert(kyra, { actor: amiri, command: CharacterCommand.CreateCharacter });
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a line is one live row however often it is acknowledged, recording who acknowledged it', async () => {
    await repository.acknowledge(amiri, kyra.id, acknowledgement());
    await repository.acknowledge(amiri, kyra.id, acknowledgement({ value: RuleCount.parse(13) }));
    const rows = await repository.listForCharacter(kyra.id);
    expect(rows.map((row) => [row.item, row.rule, row.value, row.acknowledgedBy])).toStrictEqual([
      [rope, RuleBreak.Invested, RuleCount.parse(13), amiri],
    ]);
  });

  test('a rune not allowed is acknowledged per rune, and the other rules keep no rune', async () => {
    const flaming = ContentId.parse(newId());
    const frost = ContentId.parse(newId());
    const misfit = { rule: RuleBreak.RuneNotAllowed, value: RuleCount.parse(1) };
    await repository.acknowledge(amiri, kyra.id, acknowledgement({ ...misfit, rune: flaming }));
    await repository.acknowledge(amiri, kyra.id, acknowledgement({ ...misfit, rune: frost }));
    await repository.acknowledge(amiri, kyra.id, acknowledgement());
    const rows = await repository.listForCharacter(kyra.id);
    expect(new Set(rows.map((row) => row.rune))).toStrictEqual(new Set([flaming, frost, undefined]));
  });

  test('revoking archives the row: it stays, no read sees it, and the line can be acknowledged again', async () => {
    const first = acknowledgement();
    await repository.acknowledge(amiri, kyra.id, first);
    await repository.revoke(amiri, kyra.id, { id: first.id, at: clock.now() });
    await repository.revoke(amiri, kyra.id, { id: first.id, at: clock.now() });
    expect(await repository.listForCharacter(kyra.id)).toStrictEqual([]);
    const kept = await database.db.execute(
      sql`select archived_at from character_item_acknowledgements where id = ${first.id}`,
    );
    expect(kept).toHaveLength(1);

    await repository.acknowledge(amiri, kyra.id, acknowledgement());
    expect(await repository.listForCharacter(kyra.id)).toHaveLength(1);
  });

  test('only the character’s own acknowledgement can be revoked through it', async () => {
    const mine = acknowledgement();
    await repository.acknowledge(amiri, kyra.id, mine);
    const characters = new DrizzleCharacterRepository(database.db);
    const seelah = new CharacterBuilder().named('Seelah').ownedBy(amiri).build();
    await characters.insert(seelah, { actor: amiri, command: CharacterCommand.CreateCharacter });

    await repository.revoke(amiri, seelah.id, { id: mine.id, at: clock.now() });

    expect(await repository.listForCharacter(kyra.id)).toHaveLength(1);
  });

  test('the database refuses to delete an acknowledgement (ADR-0062)', async () => {
    await repository.acknowledge(amiri, kyra.id, acknowledgement());
    const error = await rejection(
      database.db.$client.unsafe(`delete from character_item_acknowledgements where character_id = '${kyra.id}'`),
    );
    expect(error).toBeInstanceOf(Error);
  });

  test('deleting the owner who acknowledged it keeps the acknowledgement', async () => {
    const gone = UserId.parse(newId());
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${gone}, 'Gone', false, ${at}, ${at})`,
    );
    await repository.acknowledge(gone, kyra.id, acknowledgement({ acknowledgedBy: gone }));
    await database.db.execute(sql`delete from users where id = ${gone}`);
    const rows = await repository.listForCharacter(kyra.id);
    expect(rows.map((row) => row.acknowledgedBy)).toStrictEqual([undefined]);
  });

  test('every lookup is served by an index', async () => {
    const made = acknowledgement();
    await repository.acknowledge(amiri, kyra.id, made);
    await repository.listForCharacter(kyra.id);
    await repository.revoke(amiri, kyra.id, { id: made.id, at: clock.now() });
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
