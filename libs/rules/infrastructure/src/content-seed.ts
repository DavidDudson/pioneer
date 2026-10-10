import { contentPackId, PackVisibility } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentLevel, Level, PackContents, PackContentsLoader, PackId } from '@pioneer/rules/sdk';
import { FIRST_VERSION, nextVersion } from '@pioneer/shared/kernel';
import type { Clock, ValueOf, Version } from '@pioneer/shared/kernel';
import { and, eq, notInArray, sql } from 'drizzle-orm';
import type { BunSQLDatabase, BunSQLQueryResultHKT } from 'drizzle-orm/bun-sql';
import type { PgDatabase } from 'drizzle-orm/pg-core';

import { contentHash } from './content-hash';
import { contentEntries, contentPacks } from './content.table';

type Database = BunSQLDatabase<Record<string, unknown>>;
/** The database or a transaction on it: what the seed's writes run on. */
type Executor = PgDatabase<BunSQLQueryResultHKT, Record<string, unknown>>;
type EntryRow = typeof contentEntries.$inferInsert;

/** First key of the advisory lock a pack's seed holds; the second is the pack. Every seeder must use the same one. */
const SEED_LOCK = 109_002;
/** Names the seed on the audit rows it writes, as `stampAudit` names a command; there is no actor. */
const SEED_COMMAND = 'content-seed';
/** Entries per insert: 10 parameters each stays well under Postgres's 65,535 per statement. */
const BATCH_SIZE = 1000;

export const SeedOutcome = {
  /** The pack is new or its hash changed, so its rows were written. */
  Seeded: 'seeded',
  /** The stored hash matched; nothing was written. */
  Unchanged: 'unchanged',
} as const;
export type SeedOutcome = ValueOf<typeof SeedOutcome>;

/** What seeding one pack did. */
export interface PackSeed {
  readonly pack: PackId;
  readonly outcome: SeedOutcome;
  /** The pack row's version afterwards: one more than before when seeded. */
  readonly version: Version;
  /** Entries no longer in the pack, deleted. */
  readonly removed: number;
}

/** One pack's seed in progress: its checked files, their hash, and the transaction and time it writes with. */
interface PackWrite {
  readonly tx: Executor;
  readonly contents: PackContents;
  readonly hash: string;
  readonly at: string;
}

interface StoredPack {
  /** Whether the stored hash is the one being seeded. */
  readonly unchanged: boolean;
  readonly version: Version;
}

function batches<Item>(items: readonly Item[]): readonly (readonly Item[])[] {
  const count = Math.ceil(items.length / BATCH_SIZE);
  return Array.from({ length: count }, (_unused, index) => items.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE));
}

/** Kinds without a level (a language, a sense) have no `level` key at all. */
function levelOf(entry: ContentEntry): ContentLevel | Level | undefined {
  return 'level' in entry ? entry.level : undefined;
}

function entryRow(write: PackWrite, entry: ContentEntry): EntryRow {
  const { id, kind, slug, name, rarity, traits } = entry;
  const packId = contentPackId(write.contents.file.id);
  return {
    id,
    packId,
    kind,
    slug,
    name,
    level: levelOf(entry),
    rarity,
    traits: [...traits],
    data: entry,
    updatedAt: write.at,
  };
}

async function upsertPack(write: PackWrite, stored: StoredPack | undefined): Promise<Version> {
  const { file } = write.contents;
  const version = stored === undefined ? FIRST_VERSION : nextVersion(stored.version);
  const pack = {
    title: file.title,
    publisher: file.publisher,
    license: file.license,
    version,
    contentHash: write.hash,
    data: file,
    updatedAt: write.at,
  };
  await write.tx
    .insert(contentPacks)
    .values({ id: contentPackId(file.id), slug: file.id, visibility: PackVisibility.Public, ...pack })
    .onConflictDoUpdate({ target: contentPacks.id, set: pack });
  return version;
}

/** Inserts new entries and rewrites changed ones; an unchanged entry keeps its row and its `updated_at`. */
async function upsertEntries(write: PackWrite): Promise<void> {
  const set = {
    kind: sql`excluded.kind`,
    slug: sql`excluded.slug`,
    name: sql`excluded.name`,
    level: sql`excluded.level`,
    rarity: sql`excluded.rarity`,
    traits: sql`excluded.traits`,
    data: sql`excluded.data`,
    updatedAt: sql`excluded.updated_at`,
  };
  const setWhere = sql`${contentEntries.data} is distinct from excluded.data`;
  await Promise.all(
    batches(write.contents.entries).map(async (batch) =>
      write.tx
        .insert(contentEntries)
        .values(batch.map((entry) => entryRow(write, entry)))
        .onConflictDoUpdate({ target: contentEntries.id, set, setWhere }),
    ),
  );
}

/** Deletes the pack's rows for entries no longer in it; returns how many. */
async function removeStale(write: PackWrite): Promise<number> {
  const kept = write.contents.entries.map((entry) => entry.id);
  const stale = and(
    eq(contentEntries.packId, contentPackId(write.contents.file.id)),
    notInArray(contentEntries.id, kept),
  );
  const removed = await write.tx.delete(contentEntries).where(stale).returning({ id: contentEntries.id });
  return removed.length;
}

async function seedPack(db: Database, contents: PackContents, at: string): Promise<PackSeed> {
  const pack = contents.file.id;
  const hash = contentHash(contents);
  return db.transaction(async (tx): Promise<PackSeed> => {
    // Seeds of one pack run one at a time, so a second waits and then finds the hash the first stored.
    await tx.execute(sql`select pg_advisory_xact_lock(${SEED_LOCK}, hashtext(${pack}))`);
    const [stored] = await tx
      .select({ unchanged: sql<boolean>`${contentPacks.contentHash} = ${hash}`, version: contentPacks.version })
      .from(contentPacks)
      .where(eq(contentPacks.id, contentPackId(pack)));
    if (stored?.unchanged === true) {
      return { pack, outcome: SeedOutcome.Unchanged, version: stored.version, removed: 0 };
    }
    await tx.execute(sql`select set_config('pioneer.command', ${SEED_COMMAND}, true)`);
    const write: PackWrite = { tx, contents, hash, at };
    const version = await upsertPack(write, stored);
    await upsertEntries(write);
    const removed = await removeStale(write);
    return { pack, outcome: SeedOutcome.Seeded, version, removed };
  });
}

/**
 * Upserts official packs into the content tables by id (content-model.md, "Packs and storage"). Every pack is loaded
 * and checked before anything is written. Each pack is seeded in one transaction: its row and entries are upserted
 * and entries no longer in it are deleted, so a pack that fails leaves its previous rows as they were. A pack whose
 * `content_hash` matches is skipped without writing, so a re-seed of unchanged packs changes nothing.
 */
export async function seedContentPacks(
  db: Database,
  packs: readonly PackContentsLoader[],
  clock: Clock,
): Promise<readonly PackSeed[]> {
  const contents = await Promise.all(packs.map(async (pack) => pack.load()));
  const at = clock.now().toString();
  return Promise.all(contents.map(async (pack) => seedPack(db, pack, at)));
}
