import { ApplicationInitStatus, DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { Locale } from '@pioneer/shared/kernel';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideI18n } from './i18n';
import { BROWSER_LANGUAGES, LocalePreferences, PREFERENCE_STORAGE } from './locale-preferences';

const STORAGE_KEY = 'pioneer.locale';

async function setup(
  browser: readonly string[],
  storage: Storage | undefined = localStorage,
): Promise<LocalePreferences> {
  TestBed.configureTestingModule({
    providers: [
      provideI18n({ en: async () => ({ hello: 'Hello' }) }),
      { provide: BROWSER_LANGUAGES, useValue: browser },
      { provide: PREFERENCE_STORAGE, useValue: storage },
    ],
  });
  await TestBed.inject(ApplicationInitStatus).donePromise;
  return TestBed.inject(LocalePreferences);
}

describe(LocalePreferences, () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('resolves from the browser languages and applies the locale before bootstrap', async () => {
    const preferences = await setup(['en-GB', 'fr']);
    const root = TestBed.inject(DOCUMENT).documentElement;

    expect(preferences.ui()).toBe(Locale.English);
    expect(TestBed.inject(TranslocoService).translate('hello')).toBe('Hello');
    expect(root.lang).toBe('en');
    expect(root.dir).toBe('ltr');
  });

  it('falls back to en when neither storage nor browser has a supported locale', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ui: 'xx', content: 'yy' }));
    const preferences = await setup(['fr-FR', 'ja']);

    expect(preferences.ui()).toBe(Locale.English);
    expect(preferences.content()).toBe(Locale.English);
  });

  it('treats corrupt stored preferences as none', async () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const preferences = await setup(['en']);

    expect(preferences.ui()).toBe(Locale.English);
  });

  it('persists UI and content locales independently', async () => {
    const preferences = await setup(['en']);

    preferences.setContent(Locale.English);
    await preferences.setUi(Locale.English);

    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify({ ui: 'en', content: 'en' }));
  });

  it('still works when storage is blocked', async () => {
    const preferences = await setup(['en'], undefined);

    preferences.setContent(Locale.English);
    expect(preferences.content()).toBe(Locale.English);
  });
});
