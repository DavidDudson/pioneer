import { PackDependencyRepository } from '@pioneer/homebrew/application';
import { contentPackDeps, contentPacks } from '@pioneer/rules/infrastructure';
import type { ContentPackId, PackDependencyEdge } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';
import type { UserId, Uuid } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

/**
 * Key of the advisory lock every addition holds, so two cannot each pass a cycle check and then close one together.
 * An archive or restore holds it too, so a live pack is never left extending an archived one.
 */
export const GRAPH_LOCK = 109_003;
/** Name the commands on the audit rows they write, as a service use case names a command. */
const ADD_COMMAND = 'add-homebrew-pack-dependency';
const REMOVE_COMMAND = 'remove-homebrew-pack-dependency';

export class DrizzlePackDependencyRepository extends PackDependencyRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async edges(): Promise<readonly PackDependencyEdge[]> {
    const rows = await this.#db
      .select({ pack: contentPackDeps.packId, dependsOn: contentPackDeps.dependsOn })
      .from(contentPackDeps)
      .orderBy(asc(contentPackDeps.packId), asc(contentPackDeps.dependsOn));
    return rows;
  }

  public override async add(actor: UserId, edge: PackDependencyEdge, whileLocked: () => Promise<void>): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: ADD_COMMAND });
      await tx.execute(sql`select pg_advisory_xact_lock(${GRAPH_LOCK})`);
      // Both packs are locked, in id order so two additions cannot wait on each other.
      // A visibility change of either pack waits for this to commit, and so sees the dependency.
      await tx
        .select({ id: contentPacks.id })
        .from(contentPacks)
        .where(inArray(contentPacks.id, [edge.pack, edge.dependsOn]))
        .orderBy(asc(contentPacks.id))
        .for('update');
      await whileLocked();
      const id: Uuid = newId();
      await tx
        .insert(contentPackDeps)
        .values({ id, packId: edge.pack, dependsOn: edge.dependsOn })
        .onConflictDoNothing({ target: [contentPackDeps.packId, contentPackDeps.dependsOn] });
    });
  }

  public override async remove(actor: UserId, edge: PackDependencyEdge): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: REMOVE_COMMAND });
      await tx
        .delete(contentPackDeps)
        .where(and(eq(contentPackDeps.packId, edge.pack), eq(contentPackDeps.dependsOn, edge.dependsOn)));
    });
  }

  public override async dependentsOf(pack: ContentPackId): Promise<readonly ContentPackId[]> {
    const rows = await this.#db
      .select({ pack: contentPackDeps.packId })
      .from(contentPackDeps)
      .where(eq(contentPackDeps.dependsOn, pack));
    return rows.map((row) => row.pack);
  }
}
