import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CharacterService } from '@pioneer/character/application';
import { CharacterCommand, HERITAGE_SLOT } from '@pioneer/character/domain';
import { fixtureOwnerId } from '@pioneer/character/domain/testing';
import { briarRoseExport } from '@pioneer/interop/pathbuilder/testing';
import { Attribute, ContentKind } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { auditLog } from '@pioneer/shared/server';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, sql } from 'drizzle-orm';

import { DrizzleCharacterRepository } from './drizzle-character-repository';

/** A Pathbuilder import against a throwaway Postgres database; skipped when TEST_DATABASE_URL is unset. */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-07T10:00:00Z');
const all = Object.values(Attribute);
/** Briar Rose's content: ancestry, heritage, background and class. */
const briarPack = new ContentPackBuilder()
  .withId('howl-of-the-wild')
  .withAncestry('goloma', { boosts: [all] })
  .withHeritage('vigilant-goloma', 'goloma')
  .withBackground('dendrologist', [['con', 'wis'], all])
  .withClass('animist', ['wis']);

describe.skipIf(adminUrl === undefined)('Pathbuilder import (postgres)', () => {
  let database: TestDatabase;
  let service: CharacterService;
  let briarService: CharacterService;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    const at = clock.now().toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${fixtureOwnerId}, 'Owner', false, ${at}, ${at})`,
    );
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    service = new CharacterService(new DrizzleCharacterRepository(database.db), content, clock);
    const briarContent = fixedContent(briarPack.build());
    briarService = new CharacterService(new DrizzleCharacterRepository(database.db), briarContent, clock);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('create, level, heritage and every slot land in one write, logged as importPathbuilder', async () => {
    const { character } = await briarService.importPathbuilder(fixtureOwnerId, briarRoseExport);
    const entries = await database.db.select().from(auditLog).where(eq(auditLog.rowId, character.id));
    expect(entries.map((entry) => [entry.action, entry.rowVersion, entry.actorId, entry.command])).toStrictEqual([
      ['insert', 1, fixtureOwnerId, CharacterCommand.ImportPathbuilder],
    ]);
    expect(entries[0]?.after).toMatchObject({ name: 'Briar Rose', level: 11 });
    const stored = await briarService.get(fixtureOwnerId, character.id);
    expect(stored.document.build.choices).toStrictEqual(character.document.build.choices);
    expect<Readonly<Record<string, string>>>(stored.document.build.choices).toMatchObject({
      [HERITAGE_SLOT]: briarPack.idOf(ContentKind.Heritage, 'vigilant-goloma'),
      'boost:1:background:0': 'wis',
      'boost:10:free:3': 'dex',
    });
  });

  test('a refused import writes nothing', async () => {
    const before = await database.db.select().from(auditLog);
    await rejection(service.importPathbuilder(fixtureOwnerId, briarRoseExport));
    const after = await database.db.select().from(auditLog);
    expect(after).toHaveLength(before.length);
  });
});
