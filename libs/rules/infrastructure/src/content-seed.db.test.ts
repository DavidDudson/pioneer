import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import {
  ContentEntry,
  contentId,
  contentPackId,
  PackId,
  packContentsFromFiles,
  PackVisibility,
  Slug,
} from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { fixedClock, FIRST_VERSION, nextVersion } from '@pioneer/shared/kernel';
import type { Clock } from '@pioneer/shared/kernel';
import { auditLog } from '@pioneer/shared/server';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { and, asc, eq, sql } from 'drizzle-orm';

import { contentHash } from './content-hash';
import { SeedOutcome, seedContentPacks } from './content-seed';
import { contentEntries, contentPacks } from './content.table';

/**
 * Runs against a throwaway Postgres database (see createTestDatabase). Skipped when TEST_DATABASE_URL is unset; CI
 * always sets it. Each test seeds its own pack, so tests share the database without seeing each other's rows.
 */
const adminUrl = testDatabaseUrl();
const firstSeed = fixedClock('2026-10-10T10:00:00Z');
const laterSeed = fixedClock('2026-10-11T10:00:00Z');
/** The audit command a seed stamps. */
const SEED_COMMAND = 'content-seed';
const WRITE = /^\s*(?:insert|update|delete)\b/iu;

interface Language {
  readonly slug: string;
  readonly name: string;
}

const COMMON: Language = { slug: 'common', name: 'Common' };
const DRACONIC: Language = { slug: 'draconic', name: 'Draconic' };
const ELVEN: Language = { slug: 'elven', name: 'Elven' };

function languageEntry(pack: string, { slug, name }: Language): object {
  return {
    id: contentId(PackId.parse(pack), Slug.parse(slug)),
    pack,
    kind: 'language',
    slug,
    name,
    rarity: 'common',
    traits: ['humanoid'],
    sources: [{ kind: 'book', book: 'player-core', page: 89 }],
    description: [],
    rules: [],
    data: {},
  };
}

/** A pack of languages, as its JSON files would hold it. */
function languagePack(pack: string, languages: readonly Language[]): PackContents {
  const packFile = { id: pack, title: 'Test Pack', publisher: 'Pioneer', license: 'homebrew' };
  return packContentsFromFiles(packFile, [languages.map((language) => languageEntry(pack, language))]);
}

/** The database error behind a failed seed: Drizzle wraps it, naming the query. */
async function causeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return error instanceof Error ? String(error.cause) : String(error);
  }
  throw new Error('expected a failure');
}

function loader(contents: PackContents): PackContentsLoader {
  return { id: contents.file.id, load: async () => contents };
}

describe.skipIf(adminUrl === undefined)('seedContentPacks (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
  });

  afterAll(async () => {
    const problems = await unindexedQueries(database.db, recorder);
    expect(problems).toStrictEqual([]);
    await database.drop();
  });

  async function seed(contents: PackContents, clock: Clock = firstSeed): Promise<SeedOutcome | undefined> {
    const [result] = await seedContentPacks(database.db, [loader(contents)], clock);
    return result?.outcome;
  }

  async function storedPack(contents: PackContents): Promise<typeof contentPacks.$inferSelect | undefined> {
    const [row] = await database.db
      .select()
      .from(contentPacks)
      .where(eq(contentPacks.id, contentPackId(contents.file.id)));
    return row;
  }

  async function storedEntries(contents: PackContents): Promise<(typeof contentEntries.$inferSelect)[]> {
    return database.db
      .select()
      .from(contentEntries)
      .where(eq(contentEntries.packId, contentPackId(contents.file.id)))
      .orderBy(asc(contentEntries.slug));
  }

  test('a first seed writes the pack row and one row per entry, the whole entry in data', async () => {
    const pack = languagePack('first-seed', [COMMON, DRACONIC]);
    const outcome = await seed(pack);

    expect(outcome).toBe(SeedOutcome.Seeded);
    const row = await storedPack(pack);
    expect(row).toMatchObject({
      id: contentPackId(pack.file.id),
      slug: pack.file.id,
      title: pack.file.title,
      publisher: pack.file.publisher,
      visibility: PackVisibility.Public,
      license: pack.file.license,
      version: FIRST_VERSION,
      contentHash: contentHash(pack),
      data: pack.file,
      updatedAt: '2026-10-10 10:00:00.000+00',
    });
    // Official: no owner.
    expect(row?.ownerId).toBeNull();
    const rows = await storedEntries(pack);
    expect(rows.map(({ slug, name, kind, rarity, traits }) => ({ slug, name, kind, rarity, traits }))).toStrictEqual(
      pack.entries.map(({ slug, name, kind, rarity, traits }) => ({ slug, name, kind, rarity, traits: [...traits] })),
    );
    // Languages have no level.
    for (const { level } of rows) {
      expect(level).toBeNull();
    }
    expect(rows.map((stored) => ContentEntry.parse(stored.data))).toStrictEqual([...pack.entries]);
  });

  test('re-seeding an unchanged pack writes nothing', async () => {
    const pack = languagePack('reseed', [COMMON, DRACONIC]);
    await seed(pack);
    const before = recorder.queries.length;

    const outcome = await seed(pack, laterSeed);

    expect(outcome).toBe(SeedOutcome.Unchanged);
    const writes = recorder.queries.slice(before).filter(({ query }) => WRITE.test(query));
    expect(writes).toStrictEqual([]);
    const row = await storedPack(pack);
    expect(row?.version).toBe(FIRST_VERSION);
  });

  test('an edited entry is rewritten; the others keep their rows', async () => {
    await seed(languagePack('edited', [COMMON, DRACONIC]));
    const edited = languagePack('edited', [COMMON, { ...DRACONIC, name: 'Draconic (Iruxi)' }]);

    const outcome = await seed(edited, laterSeed);

    expect(outcome).toBe(SeedOutcome.Seeded);
    const row = await storedPack(edited);
    expect(row?.version).toBe(nextVersion(FIRST_VERSION));
    const rows = await storedEntries(edited);
    expect(rows.map(({ name }) => name)).toStrictEqual(edited.entries.map(({ name }) => name));
    expect(rows.map(({ updatedAt }) => updatedAt)).toStrictEqual([
      '2026-10-10 10:00:00.000+00',
      '2026-10-11 10:00:00.000+00',
    ]);
  });

  test('an entry removed from the pack is deleted', async () => {
    await seed(languagePack('removed', [COMMON, DRACONIC, ELVEN]));
    const trimmed = languagePack('removed', [COMMON, ELVEN]);

    const [result] = await seedContentPacks(database.db, [loader(trimmed)], laterSeed);

    expect(result?.removed).toBe(1);
    const rows = await storedEntries(trimmed);
    expect(rows.map(({ slug }) => slug)).toStrictEqual(trimmed.entries.map(({ slug }) => slug));
  });

  test('a pack that fails part way leaves its previous rows as they were', async () => {
    const original = languagePack('rolled-back', [COMMON, DRACONIC]);
    await seed(original);
    // A write the database refuses, after the pack row and the edited entry are written.
    await database.db.execute(sql`
      create function refuse_elven() returns trigger language plpgsql as $$
      begin
        if new.slug = 'elven' then raise exception 'elven refused'; end if;
        return new;
      end $$;
      create trigger refuse_elven before insert on content_entries for each row execute function refuse_elven();
    `);
    const failing = languagePack('rolled-back', [{ ...COMMON, name: 'Taldane' }, ELVEN]);

    const failure = await causeOf(seed(failing, laterSeed));
    await database.db.execute(sql`drop trigger refuse_elven on content_entries; drop function refuse_elven();`);

    expect(failure).toContain('elven refused');
    const row = await storedPack(original);
    expect(row).toMatchObject({ version: FIRST_VERSION, contentHash: contentHash(original) });
    const rows = await storedEntries(original);
    expect(rows.map(({ name }) => name)).toStrictEqual(original.entries.map(({ name }) => name));
  });

  test('a seed names itself on the audit rows it writes', async () => {
    const pack = languagePack('audited', [COMMON]);
    await seed(pack);

    const packRow = and(eq(auditLog.tableName, 'content_packs'), eq(auditLog.rowId, contentPackId(pack.file.id)));
    const audited = await database.db
      .select({ command: auditLog.command, actorId: auditLog.actorId })
      .from(auditLog)
      .where(packRow);
    expect(audited.map(({ command }) => command)).toStrictEqual([SEED_COMMAND]);
    // A deploy, not a user.
    for (const { actorId } of audited) {
      expect(actorId).toBeNull();
    }
  });
});
