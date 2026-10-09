import { ApplicationInitStatus, DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { DistanceUnit, Locale } from '@pioneer/shared/kernel';
import { throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { provideI18n } from './i18n';
import { LocalePreferences, PREFERENCE_STORAGE } from './locale-preferences';

const STORAGE_KEY = 'pioneer.locale';

async function setup(storage: Storage | undefined = localStorage): Promise<LocalePreferences> {
  TestBed.configureTestingModule({
    providers: [
      provideI18n({ en: async () => ({ hello: 'Hello' }) }),
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

  it('shows the defaults with nothing cached, and applies the locale before bootstrap', async () => {
    const preferences = await setup();
    const root = TestBed.inject(DOCUMENT).documentElement;

    expect([preferences.ui(), preferences.content(), preferences.distanceUnit()]).toStrictEqual(['en', 'en', 'feet']);
    expect(TestBed.inject(TranslocoService).translate('hello')).toBe('Hello');
    expect(root.lang).toBe('en');
    expect(root.dir).toBe('ltr');
  });

  it('starts from the cached choices of the last signed-in user', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ui: 'en', distanceUnit: 'metres' }));
    const preferences = await setup();

    expect(preferences.distanceUnit()).toBe(DistanceUnit.Metres);
  });

  it('ignores unknown cached values and corrupt storage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ui: 'xx', content: 'yy', distanceUnit: 'cubits' }));
    const unknown = await setup();
    expect([unknown.ui(), unknown.content(), unknown.distanceUnit()]).toStrictEqual(['en', 'en', 'feet']);

    TestBed.resetTestingModule();
    localStorage.setItem(STORAGE_KEY, '{not json');
    const corrupt = await setup();
    expect(corrupt.distanceUnit()).toBe(DistanceUnit.Feet);
  });

  it('adopts account choices, defaults for the rest, and caches them', async () => {
    const preferences = await setup();

    await preferences.adopt({ content: Locale.English, distanceUnit: DistanceUnit.Metres });

    expect(preferences.ui()).toBe(Locale.English);
    expect(preferences.distanceUnit()).toBe(DistanceUnit.Metres);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify({ content: 'en', distanceUnit: 'metres' }));
  });

  it('resets to the defaults and forgets the cache when nobody is signed in', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ distanceUnit: 'metres' }));
    const preferences = await setup();

    await preferences.reset();

    expect(preferences.distanceUnit()).toBe(DistanceUnit.Feet);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('forgets the cache even when the default locale fails to load', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ distanceUnit: 'metres' }));
    const preferences = await setup();
    vi.spyOn(TestBed.inject(TranslocoService), 'load').mockReturnValue(throwError(() => new Error('offline')));

    await expect(preferences.reset()).rejects.toThrow('offline');

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('still works when storage is blocked', async () => {
    const preferences = await setup(undefined);

    await preferences.adopt({ distanceUnit: DistanceUnit.Metres });
    expect(preferences.distanceUnit()).toBe(DistanceUnit.Metres);
    await preferences.reset();
    expect(preferences.distanceUnit()).toBe(DistanceUnit.Feet);
  });
});
