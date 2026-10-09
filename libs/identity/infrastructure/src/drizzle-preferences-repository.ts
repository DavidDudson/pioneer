import { PreferencesRepository } from '@pioneer/identity/application';
import { NO_PREFERENCES, patchPreferences } from '@pioneer/identity/domain';
import type { Preferences, PreferencesPatch, UserId } from '@pioneer/identity/domain';
import type { Temporal } from '@pioneer/shared/kernel';
import { eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { userPreferences } from './identity.table';

type PreferencesRow = typeof userPreferences.$inferSelect;

function toPreferences(row: PreferencesRow): Preferences {
  return { uiLocale: row.uiLocale, contentLocale: row.contentLocale, distanceUnit: row.distanceUnit };
}

export class DrizzlePreferencesRepository extends PreferencesRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async find(userId: UserId): Promise<Preferences> {
    const [row] = await this.#db.select().from(userPreferences).where(eq(userPreferences.id, userId)).limit(1);
    return row === undefined ? NO_PREFERENCES : toPreferences(row);
  }

  /** One upsert, so two first choices at once can't both insert; only the given fields are written. */
  public override async update(userId: UserId, patch: PreferencesPatch, now: Temporal.Instant): Promise<Preferences> {
    // Drizzle leaves `undefined` fields out of the SET list, so fields the patch omits keep their value.
    const changed = { ...patch, updatedAt: now.toString() };
    const [row] = await this.#db
      .insert(userPreferences)
      .values({ ...patchPreferences(NO_PREFERENCES, patch), updatedAt: changed.updatedAt, id: userId })
      .onConflictDoUpdate({ target: userPreferences.id, set: changed })
      .returning();
    if (row === undefined) {
      throw new Error(`Upsert of preferences for user ${userId} returned no row`);
    }
    return toPreferences(row);
  }
}
