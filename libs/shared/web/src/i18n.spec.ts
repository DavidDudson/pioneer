import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';

import { provideI18n } from './i18n';

const messages = {
  greeting: "Hello {name}, welcome to Paizo's world",
  characters: '{count, plural, =0 {No characters} one {# character} other {# characters}}',
  nested: { label: 'Nested' },
};

async function setup(): Promise<TranslocoService> {
  TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => messages })] });
  // The source locale loads in an app initializer, before anything renders.
  await TestBed.inject(ApplicationInitStatus).donePromise;
  return TestBed.inject(TranslocoService);
}

describe(provideI18n, () => {
  it('formats ICU params and keeps plain apostrophes', async () => {
    const i18n = await setup();
    expect(i18n.translate('greeting', { name: 'Ezren' })).toBe("Hello Ezren, welcome to Paizo's world");
  });

  it('formats ICU plurals', async () => {
    const i18n = await setup();
    expect(i18n.translate('characters', { count: 0 })).toBe('No characters');
    expect(i18n.translate('characters', { count: 1 })).toBe('1 character');
    expect(i18n.translate('characters', { count: 12 })).toBe('12 characters');
  });

  it('flattens nested messages into dotted keys', async () => {
    const i18n = await setup();
    expect(i18n.translate('nested.label')).toBe('Nested');
  });
});
