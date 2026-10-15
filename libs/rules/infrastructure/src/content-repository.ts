import { loadOrder, packContentsFromFiles } from '@pioneer/rules/sdk';
import type { ContentPackId, PackContents, PackId } from '@pioneer/rules/sdk';
import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { contentEntries, contentPackDeps, contentPacks } from './content.table';

type Database = BunSQLDatabase<Record<string, unknown>>;

/** What the reads below need of a database or a transaction. */
type Reader = Pick<Database, 'select'>;

/**
 * The homebrew packs among `roots` and every pack they extend, each once and after the packs it extends, so registering
 * them in this order resolves a pack's references as it goes. Official packs are left out: a registry holds them already.
 * An archived pack is left out (ADR-0062): it is not in force.
 */
async function homebrewOrder(reader: Reader, roots: readonly ContentPackId[]): Promise<readonly ContentPackId[]> {
  const edges = await reader
    .select({ pack: contentPackDeps.packId, dependsOn: contentPackDeps.dependsOn })
    .from(contentPackDeps)
    .orderBy(asc(contentPackDeps.packId), asc(contentPackDeps.dependsOn));
  const ordered = [...new Set(roots.flatMap((root) => loadOrder(edges, root)))];
  if (ordered.length === 0) {
    return [];
  }
  const homebrew = await reader
    .select({ id: contentPacks.id })
    .from(contentPacks)
    .where(and(inArray(contentPacks.id, ordered), isNotNull(contentPacks.ownerId), isNull(contentPacks.archivedAt)));
  const kept = new Set(homebrew.map((row) => row.id));
  return ordered.filter((id) => kept.has(id));
}

/** A stored pack's `content_hash`: what tells a reader the pack changed since it last loaded it. */
export interface StoredPackHash {
  readonly pack: PackId;
  readonly hash: string;
}

/** Reads the content tables (content-model.md, "Packs and storage"); the seed writes them. */
export class ContentRepository {
  readonly #db: Database;

  public constructor(db: Database) {
    this.#db = db;
  }

  /** Every official pack's hash, by slug: one small query, cheap enough to ask before every use of content. */
  public async officialHashes(): Promise<readonly StoredPackHash[]> {
    return this.#db
      .select({ pack: contentPacks.slug, hash: contentPacks.contentHash })
      .from(contentPacks)
      .where(isNull(contentPacks.ownerId))
      .orderBy(asc(contentPacks.slug));
  }

  /**
   * Every official pack, by slug, with its entries. One snapshot, so a pack row and its entries come from the same
   * seed even while one runs. The rows are checked again as the files they hold (`packContentsFromFiles`).
   */
  public async loadOfficial(): Promise<readonly PackContents[]> {
    return this.#db.transaction(
      async (tx): Promise<readonly PackContents[]> => {
        const packs = await tx
          .select({ id: contentPacks.id, data: contentPacks.data })
          .from(contentPacks)
          .where(isNull(contentPacks.ownerId))
          .orderBy(asc(contentPacks.slug));
        return Promise.all(
          packs.map(async ({ id, data }): Promise<PackContents> => {
            const entries = await tx
              .select({ data: contentEntries.data })
              .from(contentEntries)
              .where(eq(contentEntries.packId, id))
              .orderBy(asc(contentEntries.kind), asc(contentEntries.slug));
            return packContentsFromFiles(data, [entries.map((entry) => entry.data)]);
          }),
        );
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  /**
   * A pack and every pack it depends on, through any number of packs, each after the packs it extends (`loadOrder`),
   * so registering them in this order resolves a pack's references as it goes. Official or homebrew alike; one
   * snapshot, like `loadOfficial`. Empty when the pack does not exist.
   */
  public async loadWithDependencies(root: ContentPackId): Promise<readonly PackContents[]> {
    return this.#db.transaction(
      async (tx): Promise<readonly PackContents[]> => {
        const edges = await tx
          .select({ pack: contentPackDeps.packId, dependsOn: contentPackDeps.dependsOn })
          .from(contentPackDeps)
          .orderBy(asc(contentPackDeps.packId), asc(contentPackDeps.dependsOn));
        const loaded = await Promise.all(
          loadOrder(edges, root).map(async (id): Promise<PackContents | undefined> => {
            const [pack] = await tx
              .select({ data: contentPacks.data })
              .from(contentPacks)
              .where(and(eq(contentPacks.id, id), isNull(contentPacks.archivedAt)));
            if (pack === undefined) {
              return undefined;
            }
            const entries = await tx
              .select({ data: contentEntries.data })
              .from(contentEntries)
              .where(eq(contentEntries.packId, id))
              .orderBy(asc(contentEntries.kind), asc(contentEntries.slug));
            return packContentsFromFiles(pack.data, [entries.map((entry) => entry.data)]);
          }),
        );
        return loaded.filter((contents) => contents !== undefined);
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  /** The hashes of the homebrew packs `homebrewOrder` gives for `roots`, by slug: what a registry of them is cached under. */
  public async homebrewHashes(roots: readonly ContentPackId[]): Promise<readonly StoredPackHash[]> {
    if (roots.length === 0) {
      return [];
    }
    const order = await homebrewOrder(this.#db, roots);
    if (order.length === 0) {
      return [];
    }
    return this.#db
      .select({ pack: contentPacks.slug, hash: contentPacks.contentHash })
      .from(contentPacks)
      .where(inArray(contentPacks.id, [...order]))
      .orderBy(asc(contentPacks.slug));
  }

  /**
   * The homebrew packs among `roots` and the packs they extend, each after the packs it extends (`homebrewOrder`), with
   * their entries. One snapshot, like `loadOfficial`. A pack that does not exist is left out.
   */
  public async loadHomebrew(roots: readonly ContentPackId[]): Promise<readonly PackContents[]> {
    if (roots.length === 0) {
      return [];
    }
    return this.#db.transaction(
      async (tx): Promise<readonly PackContents[]> => {
        const order = await homebrewOrder(tx, roots);
        return Promise.all(
          order.map(async (id): Promise<PackContents> => {
            const [pack] = await tx
              .select({ data: contentPacks.data })
              .from(contentPacks)
              .where(eq(contentPacks.id, id));
            const entries = await tx
              .select({ data: contentEntries.data })
              .from(contentEntries)
              .where(eq(contentEntries.packId, id))
              .orderBy(asc(contentEntries.kind), asc(contentEntries.slug));
            return packContentsFromFiles(pack?.data, [entries.map((entry) => entry.data)]);
          }),
        );
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
}
