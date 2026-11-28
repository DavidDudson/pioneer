import type { TableEntity, TableViewPreferences, UserId } from '@pioneer/identity/domain';
import type { Clock } from '@pioneer/shared/kernel';

import type { TableViewRepository } from './table-view-repository';

/**
 * The acting user's view preferences for each table. Each user reads and changes only their own: the actor is the
 * only user these take, so there is no id to guess.
 */
export class TableViewService {
  readonly #views: TableViewRepository;
  readonly #clock: Clock;

  public constructor(views: TableViewRepository, clock: Clock) {
    this.#views = views;
    this.#clock = clock;
  }

  public async get(actor: UserId, entity: TableEntity): Promise<TableViewPreferences> {
    return this.#views.findFor({ userId: actor, entity });
  }

  public async save(
    actor: UserId,
    entity: TableEntity,
    preferences: TableViewPreferences,
  ): Promise<TableViewPreferences> {
    return this.#views.save({ userId: actor, entity }, preferences, this.#clock.now());
  }
}
