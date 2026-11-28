import { describe, expect, it } from 'vitest';

import { messagesFor, PSEUDO_LOCALE, withPseudoLocale } from './pseudo-locale-loader';

const english = { greeting: 'Hello {name}' };

const messages = {
  en: async (): Promise<typeof english> => english,
};

describe(messagesFor, () => {
  it('returns the loader of a shipped locale', async () => {
    await expect(messagesFor(messages, 'en')()).resolves.toStrictEqual(english);
  });

  it('loads the source messages pseudo-localised for the pseudo-locale in development', async () => {
    const pseudo = await messagesFor(messages, PSEUDO_LOCALE)();
    expect(pseudo).toStrictEqual({ greeting: expect.stringContaining('{name}') });
    expect(pseudo['greeting']).not.toBe(english.greeting);
  });

  it('has no messages for a language Pioneer does not ship', () => {
    expect(() => messagesFor(messages, 'xx')).toThrow('No messages for locale "xx"');
  });
});

describe(withPseudoLocale, () => {
  it('adds the pseudo-locale beside the shipped locales in development', () => {
    expect(Object.keys(withPseudoLocale(messages))).toStrictEqual(['en', PSEUDO_LOCALE]);
  });
});
