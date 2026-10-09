import { effect, inject, Injectable, provideAppInitializer, untracked } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import { IdentityContract, NO_PREFERENCES, patchPreferences } from '@pioneer/identity/domain';
import type { Preferences } from '@pioneer/identity/domain';
import { ApiClient, ApiError, LocalePreferences } from '@pioneer/shared/web';
import type { DisplayChoices } from '@pioneer/shared/web';

import { SessionStore } from './session-store';

/** A queue moves on whether its step works or not; whoever awaits the step still gets its error. */
async function settled(step: Promise<void>): Promise<void> {
  try {
    await step;
  } catch {
    // Reported to whoever awaits the step.
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
 * answer is dropped instead of bringing their choices back. Saves run one at a time, in order, and
 * locale switches never overlap, so a sign-out reset always has the last word.
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
  /** Bumped on every change, so a load answered after a change began can't undo it. */
  #changes = 0;
  /** The save under way; the next one waits for it. */
  #saving: Promise<void> = Promise.resolve();
  /** The locale switch under way; showing and resetting take turns, so a reset is never overtaken. */
  #applying: Promise<void> = Promise.resolve();

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
    const changes = this.#changes;
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
      await this.#loaded(loaded, generation, changes);
    } catch (error: unknown) {
      if (ApiError.isUnauthorized(error)) {
        await this.#forget();
      }
      // Otherwise the cached choices stand until the next visit.
    }
  }

  /** Shows what the account holds, unless the user signed out or changed something since asking. */
  async #loaded(loaded: Preferences, generation: number, changes: number): Promise<void> {
    // A change made meanwhile is newer than this answer, and its own save shows what the account holds.
    if (generation === this.#generation && changes === this.#changes) {
      this.#saved = loaded;
      await this.#show(loaded, generation);
    }
  }

  /**
   * Changes the given preferences. They show at once and save after any save under way. If the
   * account can't save them, what it last saved comes back and the error reaches the caller.
   */
  public async update(patch: Preferences): Promise<void> {
    this.#changes += 1;
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
      await this.#show(patchPreferences(this.#showing, patch), generation);
      const saved = await this.#api.call(IdentityContract.updatePreferences, { params: {}, body: patch });
      if (generation === this.#generation) {
        this.#saved = saved;
        await this.#show(saved, generation);
      }
    } catch (error: unknown) {
      // Signed out meanwhile: the defaults are showing and stay.
      if (generation === this.#generation && !ApiError.isUnauthorized(error)) {
        await this.#show(this.#saved, generation);
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
      await this.#apply(async () => this.#locale.reset());
    } catch {
      // The messages for the default locale could not load; what is showing stays.
    }
  }

  /** Shows `preferences` once any switch under way is done, unless the user signed out first. */
  async #show(preferences: Preferences, generation: number): Promise<void> {
    await this.#apply(async () => {
      if (generation === this.#generation) {
        this.#showing = preferences;
        await this.#locale.adopt(toChoices(preferences));
      }
    });
  }

  async #apply(change: () => Promise<void>): Promise<void> {
    const before = this.#applying;
    const applying = (async (): Promise<void> => {
      await before;
      await change();
    })();
    this.#applying = settled(applying);
    return applying;
  }
}

/** Loads the signed-in user's preferences at startup, without holding up the first render. */
export function provideAccountPreferences(): EnvironmentProviders {
  return provideAppInitializer(() => {
    // oxlint-disable-next-line typescript/no-floating-promises -- load catches every error, so it never rejects
    inject(AccountPreferences).load();
  });
}
