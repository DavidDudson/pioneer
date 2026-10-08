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
import { loadWithMessages, provideMessageScope } from './message-scope';

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
