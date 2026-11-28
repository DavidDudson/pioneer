import type { TableViewPreferences, TableViewTarget } from '@pioneer/identity/domain';
import type { Temporal } from '@pioneer/shared/kernel';

/**
 * Port for each user's view preferences, one document per table. A user who never changed a table's view has none
 * stored, which reads as `NO_TABLE_VIEW_PREFERENCES`. Adapters live in `identity-infrastructure`;
 * `InMemoryTableViewRepository` is for tests.
 */
export abstract class TableViewRepository {
  public abstract findFor(target: TableViewTarget): Promise<TableViewPreferences>;

  /** Replaces the table's preferences with `preferences` and returns what is stored. */
  public abstract save(
    target: TableViewTarget,
    preferences: TableViewPreferences,
    now: Temporal.Instant,
  ): Promise<TableViewPreferences>;
}
