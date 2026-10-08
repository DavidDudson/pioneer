import { provideHttpClient } from '@angular/common/http';
import { inject, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import type { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { DISTANCE_UNIT } from '@pioneer/frontier';
import { Milliseconds } from '@pioneer/shared/kernel';
import { IdlePreloading, LocalePreferences, provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { appRoutes } from './app.routes';
import { appMessages } from './messages';

/** Server state is fresh for 30s; after that a region refetches in the background when it is shown again. */
const STALE_TIME: Milliseconds = Milliseconds.parse(30_000);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(appRoutes, withComponentInputBinding(), withPreloading(IdlePreloading)),
    // Fetch is the default backend since Angular 22.
    provideHttpClient(),
    provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { staleTime: STALE_TIME } } })),
    provideI18n(appMessages),
    { provide: DISTANCE_UNIT, useFactory: () => inject(LocalePreferences).distanceUnit },
  ],
};
