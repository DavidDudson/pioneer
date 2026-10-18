import {
  ApplicationInitStatus,
  createEnvironmentInjector,
  EnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import type { Translation } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';

import { provideI18n } from './i18n';
import { loadMessageScopes, loadWithMessages, provideMessageScope } from './message-scope';

describe(loadMessageScopes, () => {
  it('loads each scope under its own key, with no route injector', async () => {
    TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => ({}) })] });
    await TestBed.inject(ApplicationInitStatus).donePromise;
    const i18n = TestBed.inject(TranslocoService);

    await loadMessageScopes(i18n, [
      { scope: 'first', messages: { en: async (): Promise<Translation> => ({ greeting: 'Hello {name}' }) } },
      { scope: 'second', messages: { en: async (): Promise<Translation> => ({ farewell: 'Bye' }) } },
    ]);

    expect(i18n.translate('first.greeting', { name: 'Kyra' })).toBe('Hello Kyra');
    expect(i18n.translate('second.farewell')).toBe('Bye');
  });

  it('resolves at once when there are no scopes', async () => {
    TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => ({}) })] });
    await TestBed.inject(ApplicationInitStatus).donePromise;

    await expect(loadMessageScopes(TestBed.inject(TranslocoService), [])).resolves.toBeUndefined();
  });
});

describe(loadWithMessages, () => {
  it('loads the route scope together with the route code', async () => {
    TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => ({}) })] });
    await TestBed.inject(ApplicationInitStatus).donePromise;
    const scopeMessages = vi.fn<() => Promise<Translation>>(async () => ({ greeting: 'Hello {name}' }));
    // Stands in for the injector the router creates for a route's `providers`.
    const routeInjector = createEnvironmentInjector(
      [provideMessageScope('demo', { en: scopeMessages })],
      TestBed.inject(EnvironmentInjector),
    );

    const loaded = await runInInjectionContext(
      routeInjector,
      loadWithMessages(async () => 'component'),
    );

    expect(loaded).toBe('component');
    // Also fetched as the `en` fallback; the module import is cached, so this costs nothing.
    expect(scopeMessages).toHaveBeenCalledWith();
    expect(TestBed.inject(TranslocoService).translate('demo.greeting', { name: 'Kyra' })).toBe('Hello Kyra');
  });

  it('loads code alone when the route has no scope', async () => {
    TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => ({}) })] });
    await TestBed.inject(ApplicationInitStatus).donePromise;

    const loaded = await TestBed.runInInjectionContext(loadWithMessages(async () => 'component'));
    expect(loaded).toBe('component');
  });
});
