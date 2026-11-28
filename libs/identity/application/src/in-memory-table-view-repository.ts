import { NO_TABLE_VIEW_PREFERENCES } from '@pioneer/identity/domain';
import type { TableViewPreferences, TableViewTarget } from '@pioneer/identity/domain';

import { TableViewRepository } from './table-view-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryTableViewRepository extends TableViewRepository {
  readonly #views = new Map<string, TableViewPreferences>();

  static #key({ userId, entity }: TableViewTarget): string {
    return `${userId}/${entity}`;
  }

  public override async findFor(target: TableViewTarget): Promise<TableViewPreferences> {
    return this.#views.get(InMemoryTableViewRepository.#key(target)) ?? NO_TABLE_VIEW_PREFERENCES;
  }

  public override async save(
    target: TableViewTarget,
    preferences: TableViewPreferences,
  ): Promise<TableViewPreferences> {
    this.#views.set(InMemoryTableViewRepository.#key(target), preferences);

    return preferences;
  }
}
