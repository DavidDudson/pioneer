import { PackDirectory } from '@pioneer/homebrew/application';
import type { ListedPack } from '@pioneer/homebrew/application';
import { contentPacks } from '@pioneer/rules/infrastructure';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

type PackRow = typeof contentPacks.$inferSelect;

/** A pack row as the directory lists it. An official pack has no owner. */
function toListed(row: PackRow): ListedPack {
  return {
    id: row.id,
    ownerId: row.ownerId ?? undefined,
    visibility: row.visibility,
    summary: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      publisher: row.publisher,
      visibility: row.visibility,
      official: row.ownerId === null,
    },
  };
}

export class DrizzlePackDirectory extends PackDirectory {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async findById(id: ContentPackId): Promise<ListedPack | undefined> {
    const [row] = await this.#db
      .select()
      .from(contentPacks)
      .where(and(eq(contentPacks.id, id), isNull(contentPacks.archivedAt)))
      .limit(1);
    return row === undefined ? undefined : toListed(row);
  }

  public override async all(): Promise<readonly ListedPack[]> {
    // In primary key order, which the index serves; re-sorted by title here, as there are few packs.
    const rows = await this.#db
      .select()
      .from(contentPacks)
      .where(isNull(contentPacks.archivedAt))
      .orderBy(asc(contentPacks.id));
    return rows
      .map((row) => toListed(row))
      .toSorted(
        (left, right) => left.summary.title.localeCompare(right.summary.title) || left.id.localeCompare(right.id),
      );
  }
}
