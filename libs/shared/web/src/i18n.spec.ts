import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';

import { provideI18n } from './i18n';
import type { CountsLoadedKeys } from './remember-loaded-languages';

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

  it('knows a language with messages is loaded without counting them again', async () => {
    const i18n = await setup();
    const counting = i18n as unknown as CountsLoadedKeys;
    expect(counting.isLoadedTranslation('en')).toBeGreaterThan(0);
    const counted = vi.spyOn(i18n, 'getTranslation');
    expect(counting.isLoadedTranslation('en')).toBeGreaterThan(0);
    expect(counted).not.toHaveBeenCalled();
  });

  it('does not take a language with no messages for loaded', async () => {
    const i18n = await setup();
    expect((i18n as unknown as CountsLoadedKeys).isLoadedTranslation('es')).toBe(0);
  });
});
