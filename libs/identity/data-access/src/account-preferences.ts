import { effect, inject, Injectable, provideAppInitializer, untracked } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import { IdentityContract, NO_PREFERENCES, patchPreferences } from '@pioneer/identity/domain';
import type { Preferences } from '@pioneer/identity/domain';
import { ApiClient, ApiError, LocalePreferences } from '@pioneer/shared/web';
import type { DisplayChoices } from '@pioneer/shared/web';

import { SessionStore } from './session-store';

function toChoices(preferences: Preferences): DisplayChoices {
  return { ui: preferences.uiLocale, content: preferences.contentLocale, distanceUnit: preferences.distanceUnit };
}

/**
 * The signed-in user's display preferences, kept on their account so they follow them across
 * devices, and shown through `LocalePreferences`. Signed-out visitors get the defaults and have
 * nothing to choose.
 */
@Injectable({ providedIn: 'root' })
export class AccountPreferences {
  readonly #api = inject(ApiClient);
  readonly #session = inject(SessionStore);
  readonly #locale = inject(LocalePreferences);
  /** The account's preferences as last loaded or saved. */
  #account: Preferences = NO_PREFERENCES;

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
      await this.#show(loaded);
    } catch (error: unknown) {
      if (ApiError.isUnauthorized(error)) {
        await this.#forget();
      }
      // Otherwise the cached choices stand until the next visit.
    }
  }

  /**
   * Changes the given preferences. They show at once; if the account can't save them, the
   * previous ones come back and the error reaches the caller.
   */
  public async update(patch: Preferences): Promise<void> {
    const previous = this.#account;
    await this.#locale.adopt(toChoices(patchPreferences(previous, patch)));
    try {
      const saved = await this.#api.call(IdentityContract.updatePreferences, { params: {}, body: patch });
      await this.#show(saved);
    } catch (error: unknown) {
      await this.#locale.adopt(toChoices(previous));
      throw error;
    }
  }

  /** Back to the defaults. Never rejects: a locale that fails to load leaves the current one showing. */
  async #forget(): Promise<void> {
    this.#account = NO_PREFERENCES;
    try {
      await this.#locale.reset();
    } catch {
      // The messages for the default locale could not load; what is showing stays.
    }
  }

  async #show(preferences: Preferences): Promise<void> {
    this.#account = preferences;
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
