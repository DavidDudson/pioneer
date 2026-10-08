import { provideHttpClient } from '@angular/common/http';
import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import type { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { appRoutes } from './app.routes';

/** Server state is fresh for 30s; after that a region refetches in the background when it is shown again. */
const STALE_TIME_MS = 30_000;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(appRoutes, withComponentInputBinding()),
    // Fetch is the default backend since Angular 22.
    provideHttpClient(),
    provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { staleTime: STALE_TIME_MS } } })),
  ],
};
