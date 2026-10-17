import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { CharacterRuleLimitService } from '@pioneer/character/application';
import { CharacterCommand, CORE_RULE_LIMITS, InvestedCount, RuleLimitSettingValue } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { DrizzleCharacterRepository, DrizzleCharacterRuleLimitRepository } from '@pioneer/character/infrastructure';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { CampaignPackDirectory } from './attached-campaign-pack-directory';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-17T10:00:00Z');
const at = clock.now().toString();
const twelve = RuleLimitSettingValue.parse(12);

describe.skipIf(adminUrl === undefined)('character table limits over postgres', () => {
  const recorder = new QueryRecorder();
  const amiri = UserId.parse(newId());
  let database: TestDatabase;
  let repository: DrizzleCharacterRuleLimitRepository;
  let service: CharacterRuleLimitService;
  let kyra: Character;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${amiri}, 'User', false, ${at}, ${at})`,
    );
    const characters = new DrizzleCharacterRepository(database.db);
    kyra = new CharacterBuilder().named('Kyra').ownedBy(amiri).build();
    await characters.insert(kyra, { actor: amiri, command: CharacterCommand.CreateCharacter });
    repository = new DrizzleCharacterRuleLimitRepository(database.db);
    service = new CharacterRuleLimitService(
      { characters, limits: repository, campaigns: new CampaignPackDirectory(database.db) },
      clock,
    );
  });

  beforeEach(async () => {
    await database.db.execute(sql`delete from character_rule_limits where character_id = ${kyra.id}`);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a limit is one row however often it is set, recording who set it', async () => {
    await service.set(amiri, kyra.id, { limit: 'investedMax', value: twelve });
    await service.set(amiri, kyra.id, { limit: 'investedMax', value: RuleLimitSettingValue.parse(8) });
    const rows = await repository.listForCharacter(kyra.id);
    expect(rows.map((row) => [row.limit, row.value, row.setBy])).toStrictEqual([['investedMax', 8, amiri]]);
  });

  test('the number set is in force, and a reset returns the core rules’', async () => {
    await service.set(amiri, kyra.id, { limit: 'investedMax', value: twelve });
    expect(await service.of(kyra)).toStrictEqual({ ...CORE_RULE_LIMITS, investedMax: InvestedCount.parse(12) });
    await service.reset(amiri, kyra.id, 'investedMax');
    expect(await service.of(kyra)).toStrictEqual(CORE_RULE_LIMITS);
  });

  test('every lookup is served by an index', async () => {
    await service.set(amiri, kyra.id, { limit: 'handsMax', value: RuleLimitSettingValue.parse(3) });
    await service.ruleLimitSettings(amiri, kyra.id);
    await service.reset(amiri, kyra.id, 'handsMax');
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });

  test('deleting the owner who set it keeps the limit, and deleting the character removes its rows', async () => {
    await service.set(amiri, kyra.id, { limit: 'investedMax', value: twelve });
    const stranger = UserId.parse(newId());
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${stranger}, 'User', false, ${at}, ${at})`,
    );
    await database.db.execute(sql`update character_rule_limits set set_by = ${stranger}`);
    await database.db.execute(sql`delete from users where id = ${stranger}`);
    const [row] = await repository.listForCharacter(kyra.id);
    expect([row?.value, row?.setBy]).toStrictEqual([12, undefined]);
  });
});
