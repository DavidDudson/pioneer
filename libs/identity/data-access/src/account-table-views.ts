import { effect, ErrorHandler, inject, Injectable, signal, untracked } from '@angular/core';
import { IdentityContract, NO_TABLE_VIEW_PREFERENCES, TableEntity } from '@pioneer/identity/domain';
import type { TableViewPreferences } from '@pioneer/identity/domain';
import { ApiClient, ApiError } from '@pioneer/shared/web';

import { SessionStore } from './session-store';

type Views = ReadonlyMap<string, TableViewPreferences>;

/**
 * The signed-in user's view preferences for each table, kept on their account so they follow them across devices.
 * A table's preferences load the first time it asks, show at once when they change and save in the background: there
 * is no save step. Signed-out visitors have nothing stored and nothing is saved.
 *
 * A change is a function of what is stored, run once the load has answered, so changing one field never overwrites
 * the others. Saves to one table run one at a time and in order, so the last change wins on the server too. A failure
 * is reported and leaves the change on screen.
 */
@Injectable({ providedIn: 'root' })
export class AccountTableViews {
  readonly #api = inject(ApiClient);
  readonly #session = inject(SessionStore);
  readonly #errors = inject(ErrorHandler);
  readonly #views = signal<Views>(new Map());
  readonly #loading = new Map<string, Promise<void>>();
  readonly #saving = new Map<string, Promise<void>>();

  public constructor() {
    // Signing out leaves nobody whose views apply, and the next account asks again.
    effect(() => {
      if (this.#session.known() && this.#session.user() === undefined) {
        untracked(() => {
          this.#views.set(new Map());
          this.#loading.clear();
          this.#saving.clear();
        });
      }
    });
  }

  /** What is stored for `entity` right now: nothing until the account has answered. Reactive. */
  public stored(entity: string): TableViewPreferences {
    // oxlint-disable-next-line typescript/no-floating-promises -- #load catches every error, so it never rejects
    this.#loadOnce(entity);

    return this.#views().get(entity) ?? NO_TABLE_VIEW_PREFERENCES;
  }

  /**
   * Shows `change(stored)` for `entity` at once and saves it, once any load has answered. Never rejects: a failure is
   * reported and the change stays on screen.
   */
  public async update(entity: string, change: (current: TableViewPreferences) => TableViewPreferences): Promise<void> {
    const before = this.#saving.get(entity) ?? Promise.resolve();

    const saving = (async (): Promise<void> => {
      await before;
      await this.#loadOnce(entity);

      try {
        const next = change(this.stored(entity));
        this.#show(entity, next);
        await this.#save(entity, next);
      } catch (error: unknown) {
        this.#errors.handleError(error);
      }
    })();

    this.#saving.set(entity, saving);

    return saving;
  }

  async #save(entity: string, preferences: TableViewPreferences): Promise<void> {
    const user = await this.#session.whenKnown();
    const parsed = TableEntity.safeParse(entity);

    if (user !== undefined && parsed.success) {
      await this.#api.call(IdentityContract.saveTableView, { params: { entity: parsed.data }, body: preferences });
    }
  }

  async #loadOnce(entity: string): Promise<void> {
    const loading = this.#loading.get(entity) ?? this.#load(entity);
    this.#loading.set(entity, loading);

    return loading;
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
    } catch (error: unknown) {
      // Asked again on the next read, so a blip does not leave the table without its view for the whole visit.
      this.#loading.delete(entity);

      if (!(error instanceof ApiError && error.isUnauthorized)) {
        this.#errors.handleError(error);
      }
    }
  }

  #show(entity: string, preferences: TableViewPreferences): void {
    this.#views.update((views) => new Map(views).set(entity, preferences));
  }
}
