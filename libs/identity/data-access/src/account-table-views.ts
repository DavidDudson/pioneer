import { inject, Injectable, signal } from '@angular/core';
import { IdentityContract, NO_TABLE_VIEW_PREFERENCES, TableEntity } from '@pioneer/identity/domain';
import type { TableViewPreferences } from '@pioneer/identity/domain';
import { ApiClient } from '@pioneer/shared/web';

import { SessionStore } from './session-store';

type Views = ReadonlyMap<string, TableViewPreferences>;

/**
 * The signed-in user's view preferences for each table, kept on their account so they follow them across devices.
 * A table's preferences load the first time it asks, show at once when they change and save in the background: there
 * is no save step. Signed-out visitors have nothing stored and nothing is saved.
 *
 * Saves to one table run one at a time and in order, so the last change wins on the server too. A save that fails
 * leaves the change on screen; the next change saves the whole preference again.
 */
@Injectable({ providedIn: 'root' })
export class AccountTableViews {
  readonly #api = inject(ApiClient);
  readonly #session = inject(SessionStore);
  readonly #views = signal<Views>(new Map());
  readonly #requested = new Set<string>();
  readonly #saving = new Map<string, Promise<void>>();

  /** What is stored for `entity` right now: nothing until the account has answered. Reactive. */
  public stored(entity: string): TableViewPreferences {
    this.#requestOnce(entity);

    return this.#views().get(entity) ?? NO_TABLE_VIEW_PREFERENCES;
  }

  /** Shows `preferences` for `entity` at once and saves them. Never rejects. */
  public async save(entity: string, preferences: TableViewPreferences): Promise<void> {
    this.#show(entity, preferences);
    const user = await this.#session.whenKnown();
    const parsed = TableEntity.safeParse(entity);

    if (user === undefined || !parsed.success) {
      return;
    }

    const before = this.#saving.get(entity) ?? Promise.resolve();

    const saving = (async (): Promise<void> => {
      await before;

      try {
        await this.#api.call(IdentityContract.saveTableView, { params: { entity: parsed.data }, body: preferences });
      } catch {
        // The change stays on screen; the next one saves the whole preference again.
      }
    })();

    this.#saving.set(entity, saving);

    return saving;
  }

  #requestOnce(entity: string): void {
    if (this.#requested.has(entity)) {
      return;
    }

    this.#requested.add(entity);
    // oxlint-disable-next-line typescript/no-floating-promises -- load catches every error, so it never rejects
    this.#load(entity);
  }

  async #load(entity: string): Promise<void> {
    try {
      const user = await this.#session.whenKnown();
      const parsed = TableEntity.safeParse(entity);

      if (user === undefined || !parsed.success) {
        return;
      }

      const loaded = await this.#api.call(IdentityContract.tableView, {
        params: { entity: parsed.data },
        body: undefined,
      });

      // A change made while loading is newer than this answer.
      if (!this.#views().has(entity)) {
        this.#show(entity, loaded);
      }
    } catch {
      // Nothing stored shows until the next visit.
    }
  }

  #show(entity: string, preferences: TableViewPreferences): void {
    this.#views.update((views) => new Map(views).set(entity, preferences));
  }
}
