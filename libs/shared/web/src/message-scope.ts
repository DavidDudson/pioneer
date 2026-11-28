import { inject, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import { provideTranslocoScope, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import type { LocaleMessages } from './i18n';
import { messagesFor, withPseudoLocale } from './pseudo-locale-loader';

export interface MessageScope {
  readonly scope: string;
  readonly messages: LocaleMessages;
}

const MESSAGE_SCOPES = new InjectionToken<ReadonlyArray<MessageScope>>('MESSAGE_SCOPES');

/**
 * A feature's messages, keyed `<scope>.*`. Provide on the feature's route so they are split
 * from the shell and load with the route (see {@link loadWithMessages}).
 */
export function provideMessageScope(scope: string, messages: LocaleMessages): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideTranslocoScope({ scope, loader: withPseudoLocale(messages) }),
    { provide: MESSAGE_SCOPES, multi: true, useValue: { scope, messages } },
  ]);
}

/**
 * Wraps a route's `loadComponent` so the route's message scopes load in parallel with its code.
 * The page never renders before its text, and idle preloading fetches both together.
 */
export function loadWithMessages<TLoaded>(load: () => Promise<TLoaded>): () => Promise<TLoaded> {
  return async () => {
    // Runs in the route's injection context; inject before the first await.
    const i18n = inject(TranslocoService);
    const scopes = inject(MESSAGE_SCOPES, { optional: true }) ?? [];
    const [loaded] = await Promise.all([load(), loadMessageScopes(i18n, scopes)]);

    return loaded;
  };
}

/**
 * Loads message scopes into the active language. For code that renders outside a route's injector, where the scopes
 * `provideMessageScope` registered may be shadowed by another route's.
 */
export async function loadMessageScopes(i18n: TranslocoService, scopes: ReadonlyArray<MessageScope>): Promise<void> {
  const lang = i18n.getActiveLang();
  await Promise.all(
    scopes.map(async ({ scope, messages }) => {
      const path = `${scope}/${lang}`;

      // Transloco keys inline loaders by `<scope>/<lang>`.
      return firstValueFrom(i18n.load(path, { inlineLoader: { [path]: messagesFor(messages, lang) } }));
    }),
  );
}
