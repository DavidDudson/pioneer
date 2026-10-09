import { effect, inject, Injectable, provideAppInitializer, untracked } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import { IdentityContract, NO_PREFERENCES, patchPreferences } from '@pioneer/identity/domain';
import type { Preferences } from '@pioneer/identity/domain';
import { ApiClient, ApiError, LocalePreferences } from '@pioneer/shared/web';
import type { DisplayChoices } from '@pioneer/shared/web';

import { SessionStore } from './session-store';

/** The queue moves on whether a save works or not; the caller of `update` still gets its error. */
async function settled(saving: Promise<void>): Promise<void> {
  try {
    await saving;
  } catch {
    // Reported to the caller of `update`.
  }
}

function toChoices(preferences: Preferences): DisplayChoices {
  return { ui: preferences.uiLocale, content: preferences.contentLocale, distanceUnit: preferences.distanceUnit };
}

/**
 * The signed-in user's display preferences, kept on their account so they follow them across
 * devices, and shown through `LocalePreferences`. Signed-out visitors get the defaults and have
 * nothing to choose.
 *
 * Every answer is checked against the session it was asked for: once the user signs out, a late
 * answer is dropped instead of bringing their choices back. Saves run one at a time, in order.
 */
@Injectable({ providedIn: 'root' })
export class AccountPreferences {
  readonly #api = inject(ApiClient);
  readonly #session = inject(SessionStore);
  readonly #locale = inject(LocalePreferences);
  /** What the account has saved, as last loaded or saved. */
  #saved: Preferences = NO_PREFERENCES;
  /** What is showing: the saved preferences plus any changes still being saved. */
  #showing: Preferences = NO_PREFERENCES;
  /** Bumped on every sign-out, so answers to requests made before it are dropped. */
  #generation = 0;
  /** The save under way; the next one waits for it. */
  #saving: Promise<void> = Promise.resolve();

  public constructor() {
    // Signing out, or a session that expired, leaves nobody whose preferences apply.
    effect(() => {
      if (this.#session.known() && this.#session.user() === undefined) {
        untracked(() => {
          // oxlint-disable-next-line typescript/no-floating-promises -- forget catches every error, so it never rejects
          this.#forget();
        });
      }
    });
  }

  /**
   * Shows the signed-in user's preferences, or the defaults when nobody is signed in. Never
   * rejects: if the server can't answer, the cached choices stay.
   */
  public async load(): Promise<void> {
    const generation = this.#generation;
    try {
      const user = await this.#session.whenKnown();
      if (user === undefined) {
        await this.#forget();
        return;
      }
      const loaded = await this.#api.call(IdentityContract.preferences, {
        params: {},
        body: undefined,
        signedOutIsAnswer: true,
      });
      if (generation === this.#generation) {
        this.#saved = loaded;
        await this.#show(loaded);
      }
    } catch (error: unknown) {
      if (ApiError.isUnauthorized(error)) {
        await this.#forget();
      }
      // Otherwise the cached choices stand until the next visit.
    }
  }

  /**
   * Changes the given preferences. They show at once and save after any save under way. If the
   * account can't save them, what it last saved comes back and the error reaches the caller.
   */
  public async update(patch: Preferences): Promise<void> {
    const generation = this.#generation;
    const before = this.#saving;
    const saving = (async (): Promise<void> => {
      await before;
      await this.#save(patch, generation);
    })();
    this.#saving = settled(saving);
    return saving;
  }

  async #save(patch: Preferences, generation: number): Promise<void> {
    try {
      await this.#show(patchPreferences(this.#showing, patch));
      const saved = await this.#api.call(IdentityContract.updatePreferences, { params: {}, body: patch });
      if (generation === this.#generation) {
        this.#saved = saved;
        await this.#show(saved);
      }
    } catch (error: unknown) {
      // Signed out meanwhile: the defaults are showing and stay.
      if (generation === this.#generation && !ApiError.isUnauthorized(error)) {
        await this.#show(this.#saved);
      }
      throw error;
    }
  }

  /** Back to the defaults. Never rejects: a locale that fails to load leaves the current one showing. */
  async #forget(): Promise<void> {
    this.#generation += 1;
    this.#saved = NO_PREFERENCES;
    this.#showing = NO_PREFERENCES;
    try {
      await this.#locale.reset();
    } catch {
      // The messages for the default locale could not load; what is showing stays.
    }
  }

  async #show(preferences: Preferences): Promise<void> {
    this.#showing = preferences;
    await this.#locale.adopt(toChoices(preferences));
  }
}

/** Loads the signed-in user's preferences at startup, without holding up the first render. */
export function provideAccountPreferences(): EnvironmentProviders {
  return provideAppInitializer(() => {
    // oxlint-disable-next-line typescript/no-floating-promises -- load catches every error, so it never rejects
    inject(AccountPreferences).load();
  });
}
