import { NO_PREFERENCES, patchPreferences } from '@pioneer/identity/domain';
import type { Preferences, UserId } from '@pioneer/identity/domain';

import { PreferencesRepository } from './preferences-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryPreferencesRepository extends PreferencesRepository {
  readonly #preferences = new Map<UserId, Preferences>();

  public override async findFor(userId: UserId): Promise<Preferences> {
    return this.#preferences.get(userId) ?? NO_PREFERENCES;
  }

  public override async update(userId: UserId, patch: Preferences): Promise<Preferences> {
    const updated = patchPreferences(this.#preferences.get(userId) ?? NO_PREFERENCES, patch);
    this.#preferences.set(userId, updated);
    return updated;
  }
}
