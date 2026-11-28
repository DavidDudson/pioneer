import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import type { EntryWrite } from '@pioneer/homebrew/application';
import { HomebrewCommand, starterData } from '@pioneer/homebrew/domain';
import type { HomebrewPack } from '@pioneer/homebrew/domain';
import { fixtureOwnerId, HomebrewPackBuilder } from '@pioneer/homebrew/domain/testing';
import { contentEntries, contentPacks } from '@pioneer/rules/infrastructure';
import { ContentEntry, contentId, ContentKind, ContentText, EntrySlug, Rarity, SourceKind } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, sql } from 'drizzle-orm';

import { DrizzleHomebrewEntryRepository } from './drizzle-homebrew-entry-repository';
import { DrizzleHomebrewPackRepository } from './drizzle-homebrew-pack-repository';

/** Homebrew entries in `content_entries` (ADR-0062). Skipped when TEST_DATABASE_URL is unset. */
const adminUrl = testDatabaseUrl();
const NOW = fixedClock('2026-10-15T08:00:00Z').now();

/** What a write by the pack's owner is stamped with. */
function write(command: HomebrewCommand): EntryWrite {
  return { actor: fixtureOwnerId, command, now: NOW };
}

/** A level 1 feat named `name`, as its author's pack files it. */
function feat(pack: HomebrewPack, name: string): ContentEntry {
  const slug = EntrySlug.parse(`feat:${name}`);

  return ContentEntry.parse({
    id: contentId(pack.slug, slug),
    pack: pack.slug,
    kind: ContentKind.Feat,
    slug,
    name: ContentText.parse(name),
    level: 1,
    rarity: Rarity.Common,
    traits: [],
    sources: [{ kind: SourceKind.Homebrew, author: fixtureOwnerId, pack: pack.slug }],
    description: [],
    rules: [],
    data: starterData(ContentKind.Feat),
  });
}

describe.skipIf(adminUrl === undefined)('homebrew entries (postgres)', () => {
  let database: TestDatabase;
  let entries: DrizzleHomebrewEntryRepository;
  let packs: DrizzleHomebrewPackRepository;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    entries = new DrizzleHomebrewEntryRepository(database.db);
    packs = new DrizzleHomebrewPackRepository(database.db);
    const at = NOW.toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${fixtureOwnerId}, 'Owner', false, ${at}, ${at})`,
    );
  });

  afterAll(async () => {
    await database.drop();
  });

  async function newPack(slug: string): Promise<HomebrewPack> {
    const pack = new HomebrewPackBuilder().slug(slug).build();
    await packs.insert(pack);

    return pack;
  }

  test('an inserted entry is listed and found, and the pack moves on with its hash', async () => {
    const pack = await newPack('entry-insert');
    const before = await database.db.select().from(contentPacks).where(eq(contentPacks.id, pack.id));
    const strike = feat(pack, 'strike');

    expect(await entries.insert(pack.id, strike, write(HomebrewCommand.CreateEntry))).toBe(true);

    const listed = await entries.list(pack.id, false);
    expect(listed.map(({ entry }) => entry.id)).toStrictEqual([strike.id]);
    expect(await entries.find({ pack: pack.id, id: strike.id })).toMatchObject({ entry: strike });
    const after = await database.db.select().from(contentPacks).where(eq(contentPacks.id, pack.id));
    expect(after[0]?.version).toBeGreaterThan(before[0]?.version ?? 0);
    expect(after[0]?.contentHash).not.toBe(before[0]?.contentHash);
  });

  test('a slug the pack holds is refused, live or archived', async () => {
    const pack = await newPack('entry-slug');
    const strike = feat(pack, 'strike');
    await entries.insert(pack.id, strike, write(HomebrewCommand.CreateEntry));

    expect(await entries.insert(pack.id, strike, write(HomebrewCommand.CreateEntry))).toBe(false);

    await entries.setArchived({ pack: pack.id, id: strike.id }, true, write(HomebrewCommand.ArchiveEntry));

    expect(await entries.insert(pack.id, strike, write(HomebrewCommand.CreateEntry))).toBe(false);
  });

  test('archive keeps the row, hides it from the live list and moves the hash; restore undoes both', async () => {
    const pack = await newPack('entry-archive');
    const strike = feat(pack, 'strike');
    await entries.insert(pack.id, strike, write(HomebrewCommand.CreateEntry));
    const [live] = await database.db.select().from(contentPacks).where(eq(contentPacks.id, pack.id));
    const ref = { pack: pack.id, id: strike.id };

    await entries.setArchived(ref, true, write(HomebrewCommand.ArchiveEntry));
    await entries.setArchived(ref, true, write(HomebrewCommand.ArchiveEntry));

    expect(await entries.list(pack.id, false)).toStrictEqual([]);
    const archivedList = await entries.list(pack.id, true);

    expect(archivedList.map(({ entry }) => entry.id)).toStrictEqual([strike.id]);
    const [archived] = await database.db.select().from(contentPacks).where(eq(contentPacks.id, pack.id));
    expect(archived?.contentHash).not.toBe(live?.contentHash);

    await entries.setArchived(ref, false, write(HomebrewCommand.RestoreEntry));

    const liveList = await entries.list(pack.id, false);

    expect(liveList.map(({ entry }) => entry.id)).toStrictEqual([strike.id]);
    const [restored] = await database.db.select().from(contentPacks).where(eq(contentPacks.id, pack.id));
    expect(restored?.contentHash).toBe(live?.contentHash);
  });

  test('replace rewrites a live entry and keeps its id, and an archived one is not found to replace', async () => {
    const pack = await newPack('entry-replace');
    const strike = feat(pack, 'strike');
    await entries.insert(pack.id, strike, write(HomebrewCommand.CreateEntry));
    const renamed = ContentEntry.parse({ ...strike, name: 'Rending Strike' });

    expect(await entries.replace(pack.id, renamed, write(HomebrewCommand.UpdateEntry))).toBe(true);
    expect(await entries.find({ pack: pack.id, id: strike.id })).toMatchObject({ entry: { name: 'Rending Strike' } });

    await entries.setArchived({ pack: pack.id, id: strike.id }, true, write(HomebrewCommand.ArchiveEntry));

    expect(await entries.replace(pack.id, renamed, write(HomebrewCommand.UpdateEntry))).toBe(false);
  });

  test('only the pack owner writes: another actor changes nothing', async () => {
    const pack = await newPack('entry-owner');
    const stranger: EntryWrite = { actor: UserId.parse(newId()), command: HomebrewCommand.CreateEntry, now: NOW };

    expect(await entries.insert(pack.id, feat(pack, 'strike'), stranger)).toBe(false);
  });

  test('an entry row cannot be deleted, only archived', async () => {
    const pack = await newPack('entry-protected');
    const strike = feat(pack, 'strike');
    await entries.insert(pack.id, strike, write(HomebrewCommand.CreateEntry));

    const refusal = rejection(database.db.execute(sql`delete from content_entries where id = ${strike.id}`));

    const failure = await refusal;

    expect(failure.cause).toBeDefined();

    const rows = await database.db
      .select({ id: contentEntries.id })
      .from(contentEntries)
      .where(eq(contentEntries.id, strike.id));

    expect(rows).toHaveLength(1);
  });
});
