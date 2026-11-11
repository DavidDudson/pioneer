import { provideHttpClient } from '@angular/common/http';
import { inject, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import type { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { DISTANCE_UNIT } from '@pioneer/frontier';
import { provideAccountPreferences, provideSignInOnUnauthorized } from '@pioneer/identity/data-access';
import { ENTRY_PREVIEWS } from '@pioneer/rules/ui/entry-previews';
import { Milliseconds } from '@pioneer/shared/kernel';
import { IdlePreloading, LocalePreferences, provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { appRoutes } from './app.routes';
import { environment } from './environment';
import { lazyEntryPreviews } from './lazy-entry-previews';
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
    provideSignInOnUnauthorized(),
    provideAccountPreferences(),
    // Every page that gives no previews of its own still opens a card for a reference.
    { provide: ENTRY_PREVIEWS, useFactory: lazyEntryPreviews },
    { provide: DISTANCE_UNIT, useFactory: () => inject(LocalePreferences).distanceUnit },
    ...environment.providers,
  ],
};
