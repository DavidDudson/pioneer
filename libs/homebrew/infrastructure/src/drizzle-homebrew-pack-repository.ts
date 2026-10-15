import { HomebrewPackRepository } from '@pioneer/homebrew/application';
import type { GuardedChange } from '@pioneer/homebrew/application';
import { EntryCount, HomebrewPack } from '@pioneer/homebrew/domain';
import { contentEntries, contentHash, contentPacks } from '@pioneer/rules/infrastructure';
import type { ContentPackFile, ContentPackId } from '@pioneer/rules/sdk';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, count, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

type PackRow = typeof contentPacks.$inferSelect;
/** What a save writes: never `archivedAt`, which only archive and restore touch. */
type SavedRow = Omit<PackRow, 'archivedAt'>;

/** Name the commands on the audit rows they write, as a service use case names a command. */
const CREATE_COMMAND = 'create-homebrew-pack';
const SET_VISIBILITY_COMMAND = 'set-homebrew-pack-visibility';

/** A pack's owner is always set for homebrew; an official row (no owner) is never read as one. */
function toPack(row: PackRow, entryCount: EntryCount): HomebrewPack | undefined {
  if (row.ownerId === null) {
    return undefined;
  }
  return new HomebrewPack({
    id: row.id,
    version: row.version,
    slug: row.slug,
    title: row.title,
    publisher: row.publisher,
    ownerId: row.ownerId,
    visibility: row.visibility,
    entryCount,
    updatedAt: Temporal.Instant.from(row.updatedAt),
  });
}

/** Newest first, pack id breaking ties; sorted here so no query needs an index for it. */
function newestFirst(left: HomebrewPack, right: HomebrewPack): number {
  return Temporal.Instant.compare(right.updatedAt, left.updatedAt) || left.id.localeCompare(right.id);
}

function toRow(pack: HomebrewPack): SavedRow {
  const file: ContentPackFile = {
    id: pack.slug,
    title: pack.title,
    publisher: pack.publisher,
    license: HomebrewPack.license,
  };
  return {
    id: pack.id,
    slug: pack.slug,
    title: pack.title,
    publisher: pack.publisher,
    ownerId: pack.ownerId,
    visibility: pack.visibility,
    license: HomebrewPack.license,
    version: pack.version,
    contentHash: contentHash({ file, entries: [] }),
    data: file,
    updatedAt: pack.updatedAt.toString(),
  };
}

export class DrizzleHomebrewPackRepository extends HomebrewPackRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async listOwnedBy(ownerId: UserId): Promise<readonly HomebrewPack[]> {
    return this.#listFor(and(eq(contentPacks.ownerId, ownerId), isNull(contentPacks.archivedAt)));
  }

  public override async listArchivedOwnedBy(ownerId: UserId): Promise<readonly HomebrewPack[]> {
    return this.#listFor(and(eq(contentPacks.ownerId, ownerId), isNotNull(contentPacks.archivedAt)));
  }

  async #listFor(where: SQL | undefined): Promise<readonly HomebrewPack[]> {
    const rows = await this.#db.select().from(contentPacks).where(where);
    const counts = await this.#entryCounts(rows.map((row) => row.id));
    const packs = rows.flatMap((row): HomebrewPack[] => {
      const pack = toPack(row, counts.get(row.id) ?? EntryCount.parse(0));
      return pack === undefined ? [] : [pack];
    });
    return packs.toSorted(newestFirst);
  }

  public override async findById(id: ContentPackId): Promise<HomebrewPack | undefined> {
    return this.#findOne(
      and(eq(contentPacks.id, id), isNotNull(contentPacks.ownerId), isNull(contentPacks.archivedAt)),
    );
  }

  public override async findArchivedById(id: ContentPackId): Promise<HomebrewPack | undefined> {
    return this.#findOne(
      and(eq(contentPacks.id, id), isNotNull(contentPacks.ownerId), isNotNull(contentPacks.archivedAt)),
    );
  }

  async #findOne(where: SQL | undefined): Promise<HomebrewPack | undefined> {
    const [row] = await this.#db.select().from(contentPacks).where(where).limit(1);
    if (row === undefined) {
      return undefined;
    }
    const counts = await this.#entryCounts([row.id]);
    return toPack(row, counts.get(row.id) ?? EntryCount.parse(0));
  }

  public override async archive(id: ContentPackId, now: Temporal.Instant, guarded: GuardedChange): Promise<void> {
    await this.#setArchived(and(eq(contentPacks.id, id), isNull(contentPacks.archivedAt)), now.toString(), guarded);
  }

  public override async restore(id: ContentPackId, guarded: GuardedChange): Promise<void> {
    await this.#setArchived(and(eq(contentPacks.id, id), isNotNull(contentPacks.archivedAt)), sql`null`, guarded);
  }

  /**
   * Stamps or clears `archivedAt` on the homebrew pack `where` matches, with the audit context. The row is locked first,
   * as a visibility change and a new dependency lock it, so `whileLocked` sees every change that committed. Version and
   * `updatedAt` stay: nothing about the pack's content changed.
   */
  async #setArchived(
    where: SQL | undefined,
    archivedAt: SQL | string,
    { audit, whileLocked }: GuardedChange,
  ): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, audit);
      const mine = and(where, isNotNull(contentPacks.ownerId));
      const [locked] = await tx.select({ id: contentPacks.id }).from(contentPacks).where(mine).for('update');
      if (locked === undefined) {
        return;
      }
      await whileLocked?.();
      await tx.update(contentPacks).set({ archivedAt }).where(mine);
    });
  }

  public override async insert(pack: HomebrewPack): Promise<HomebrewPack | undefined> {
    const inserted = await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor: pack.ownerId, command: CREATE_COMMAND });
      // Any pack with the slug stops it, official or not: the unique slug index is the arbiter, so a race has one winner.
      return tx
        .insert(contentPacks)
        .values(toRow(pack))
        .onConflictDoNothing({ target: contentPacks.slug })
        .returning({ id: contentPacks.id });
    });
    return inserted.length === 0 ? undefined : pack;
  }

  public override async updateVisibility(
    pack: HomebrewPack,
    whileLocked?: () => Promise<void>,
  ): Promise<HomebrewPack | undefined> {
    const updated = await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor: pack.ownerId, command: SET_VISIBILITY_COMMAND });
      // Lock the row first: enabling this pack takes the same lock, so none can slip in mid-change.
      // The `whileLocked` check therefore sees every enablement that committed.
      const [locked] = await tx
        .select({ id: contentPacks.id })
        .from(contentPacks)
        .where(
          and(eq(contentPacks.id, pack.id), eq(contentPacks.ownerId, pack.ownerId), isNull(contentPacks.archivedAt)),
        )
        .for('update');
      if (locked === undefined) {
        return [];
      }
      await whileLocked?.();
      return tx
        .update(contentPacks)
        .set({ visibility: pack.visibility, updatedAt: pack.updatedAt.toString() })
        .where(and(eq(contentPacks.id, pack.id), eq(contentPacks.ownerId, pack.ownerId)))
        .returning({ id: contentPacks.id });
    });
    return updated.length === 0 ? undefined : pack;
  }

  async #entryCounts(packIds: readonly ContentPackId[]): Promise<ReadonlyMap<ContentPackId, EntryCount>> {
    if (packIds.length === 0) {
      return new Map();
    }
    const rows = await this.#db
      .select({ packId: contentEntries.packId, entries: count() })
      .from(contentEntries)
      .where(inArray(contentEntries.packId, [...packIds]))
      .groupBy(contentEntries.packId);
    return new Map(rows.map((row) => [row.packId, EntryCount.parse(row.entries)]));
  }
}
