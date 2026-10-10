import { packContentsFromFiles } from '@pioneer/rules/sdk';
import type { PackContents, PackId } from '@pioneer/rules/sdk';
import { asc, eq, isNull } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { contentEntries, contentPacks } from './content.table';

type Database = BunSQLDatabase<Record<string, unknown>>;

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
}
