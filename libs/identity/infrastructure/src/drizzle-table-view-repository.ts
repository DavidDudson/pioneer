import { TableViewRepository } from '@pioneer/identity/application';
import { NO_TABLE_VIEW_PREFERENCES, TableViewPreferences } from '@pioneer/identity/domain';
import type { TableViewTarget } from '@pioneer/identity/domain';
import { newId } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';
import { and, eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { userTableViews } from './identity.table';

export class DrizzleTableViewRepository extends TableViewRepository {
  readonly #db: BunSQLDatabase;

  public constructor(db: BunSQLDatabase) {
    super();
    this.#db = db;
  }

  public override async findFor({ userId, entity }: TableViewTarget): Promise<TableViewPreferences> {
    const [row] = await this.#db
      .select({ preferences: userTableViews.preferences })
      .from(userTableViews)
      .where(and(eq(userTableViews.userId, userId), eq(userTableViews.entity, entity)))
      .limit(1);

    // A row written under an older, looser schema reads as nothing stored rather than failing the page.
    const parsed = TableViewPreferences.safeParse(row?.preferences);

    return parsed.success ? parsed.data : NO_TABLE_VIEW_PREFERENCES;
  }

  /** One upsert, so two first changes at once can't both insert. */
  public override async save(
    { userId, entity }: TableViewTarget,
    preferences: TableViewPreferences,
    now: Temporal.Instant,
  ): Promise<TableViewPreferences> {
    const changed = { preferences, updatedAt: now.toString() };

    const [row] = await this.#db
      .insert(userTableViews)
      .values({ ...changed, id: newId(), userId, entity })
      .onConflictDoUpdate({ target: [userTableViews.userId, userTableViews.entity], set: changed })
      .returning({ preferences: userTableViews.preferences });

    if (row === undefined) {
      throw new Error(`Upsert of ${entity} view for user ${userId} returned no row`);
    }

    return row.preferences;
  }
}
