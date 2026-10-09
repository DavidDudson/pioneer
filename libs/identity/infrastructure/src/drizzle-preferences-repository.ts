import { PreferencesRepository } from '@pioneer/identity/application';
import { NO_PREFERENCES } from '@pioneer/identity/domain';
import type { Preferences, UserId } from '@pioneer/identity/domain';
import type { Temporal } from '@pioneer/shared/kernel';
import { eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { userPreferences } from './identity.table';

type PreferencesRow = typeof userPreferences.$inferSelect;

/** SQL NULL is "not chosen", absent in the domain. */
function toPreferences(row: PreferencesRow): Preferences {
  return {
    uiLocale: row.uiLocale ?? undefined,
    contentLocale: row.contentLocale ?? undefined,
    distanceUnit: row.distanceUnit ?? undefined,
  };
}

export class DrizzlePreferencesRepository extends PreferencesRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async findFor(userId: UserId): Promise<Preferences> {
    const [row] = await this.#db.select().from(userPreferences).where(eq(userPreferences.id, userId)).limit(1);
    return row === undefined ? NO_PREFERENCES : toPreferences(row);
  }

  /**
   * One upsert, so two first choices at once can't both insert. Drizzle leaves `undefined` fields
   * out of the insert and the SET list, so fields the patch omits keep their value.
   */
  public override async update(userId: UserId, patch: Preferences, now: Temporal.Instant): Promise<Preferences> {
    const changed = { ...patch, updatedAt: now.toString() };
    const [row] = await this.#db
      .insert(userPreferences)
      .values({ ...changed, id: userId })
      .onConflictDoUpdate({ target: userPreferences.id, set: changed })
      .returning();
    if (row === undefined) {
      throw new Error(`Upsert of preferences for user ${userId} returned no row`);
    }
    return toPreferences(row);
  }
}
