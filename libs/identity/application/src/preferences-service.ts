import type { Preferences, PreferencesPatch, UserId } from '@pioneer/identity/domain';
import type { Clock } from '@pioneer/shared/kernel';

import type { PreferencesRepository } from './preferences-repository';

/**
 * The acting user's display preferences. Each user reads and changes only their own: the actor is
 * the only user these take, so there is no id to guess.
 */
export class PreferencesService {
  readonly #preferences: PreferencesRepository;
  readonly #clock: Clock;

  public constructor(preferences: PreferencesRepository, clock: Clock) {
    this.#preferences = preferences;
    this.#clock = clock;
  }

  public async get(actor: UserId): Promise<Preferences> {
    return this.#preferences.find(actor);
  }

  public async update(actor: UserId, patch: PreferencesPatch): Promise<Preferences> {
    return this.#preferences.update(actor, patch, this.#clock.now());
  }
}
