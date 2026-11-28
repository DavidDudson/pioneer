import { describe, expect, it } from 'vitest';

import { loaderFor, PSEUDO_LOCALE, withPseudoLocale } from './pseudo-locale-loader';

const english = { greeting: 'Hello {name}' };

const messages = {
  en: async (): Promise<typeof english> => english,
};

describe(loaderFor, () => {
  it('returns the loader of a shipped locale', async () => {
    await expect(loaderFor(messages, 'en')()).resolves.toStrictEqual(english);
  });

  it('loads the source messages pseudo-localised for the pseudo-locale in development', async () => {
    const pseudo = await loaderFor(messages, PSEUDO_LOCALE)();
    expect(pseudo).toStrictEqual({ greeting: expect.stringContaining('{name}') });
    expect(pseudo['greeting']).not.toBe(english.greeting);
  });

  it('has no messages for a language Pioneer does not ship', () => {
    expect(() => loaderFor(messages, 'xx')).toThrow('No messages for locale "xx"');
  });
});

describe('a shipped translation', () => {
  it('drops untranslated messages so the source shows for them', async () => {
    // SAFETY: `Locale` has only `en` until the locales layer, so a second language is cast in to exercise the filter.
    const loaders = withPseudoLocale({
      en: async () => english,
      de: async () => ({ greeting: '', other: 'Ja' }),
    } as never);

    await expect(loaders['de']?.()).resolves.toStrictEqual({ other: 'Ja' });
  });
});

describe(withPseudoLocale, () => {
  it('adds the pseudo-locale beside the shipped locales in development', () => {
    expect(Object.keys(withPseudoLocale(messages))).toStrictEqual(['en', PSEUDO_LOCALE]);
  });
});
