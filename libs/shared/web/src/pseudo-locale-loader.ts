import { DOCUMENT } from '@angular/common';
import { inject, isDevMode } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { Translation } from '@jsverse/transloco';
import { LocaleSchema, SOURCE_LOCALE } from '@pioneer/shared/kernel';
import { firstValueFrom } from 'rxjs';

import type { LocaleMessages } from './i18n';

/**
 * The pseudo-locale (ADR-0084): `en` text accented and about 40% longer, to expose text that bypasses messages and
 * layouts that break on long words. It is not a `Locale`, so no picker lists it and no account stores it; a
 * development build loads it on `?pseudo-locale`. Production builds know no such language.
 */
export const PSEUDO_LOCALE = 'en-XA';

const PSEUDO_LOCALE_PARAM = 'pseudo-locale';

type MessageLoader = () => Promise<Translation>;

/** The pseudo-locale's loader: the source messages through the transform, which is its own chunk, fetched only here. */
function pseudoLoader(messages: LocaleMessages): MessageLoader {
  return async () => {
    const [{ pseudoLocaliseTree }, source] = await Promise.all([import('./pseudo-locale'), messages[SOURCE_LOCALE]()]);

    return pseudoLocaliseTree(source);
  };
}

/** The loaders by language for Transloco's scope registration: the shipped locales, plus the pseudo-locale in development. */
export function withPseudoLocale(messages: LocaleMessages): Readonly<Record<string, MessageLoader>> {
  return isDevMode() ? { ...messages, [PSEUDO_LOCALE]: pseudoLoader(messages) } : messages;
}

/** The loader for one language of a message set; a language Pioneer has no messages for is an error. */
export function messagesFor(messages: LocaleMessages, lang: string): MessageLoader {
  if (lang === PSEUDO_LOCALE && isDevMode()) {
    return pseudoLoader(messages);
  }

  const locale = LocaleSchema.safeParse(lang);

  if (!locale.success) {
    throw new Error(`No messages for locale "${lang}"`);
  }

  return messages[locale.data];
}

/**
 * Switches a development build to the pseudo-locale when the page was opened with `?pseudo-locale`. Call it in an
 * injection context; the function it returns can run later.
 */
export function pseudoLocaleActivator(): () => Promise<void> {
  const search = inject(DOCUMENT).defaultView?.location.search ?? '';
  const i18n = inject(TranslocoService);

  return async () => {
    if (!isDevMode() || !new URLSearchParams(search).has(PSEUDO_LOCALE_PARAM)) {
      return;
    }

    await firstValueFrom(i18n.load(PSEUDO_LOCALE));
    i18n.setActiveLang(PSEUDO_LOCALE);
  };
}
