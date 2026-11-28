import { provideHttpClient } from '@angular/common/http';
import { inject, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import type { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { DISTANCE_UNIT, TableViewStore } from '@pioneer/frontier';
import {
  AccountTableViews,
  provideAccountPreferences,
  provideSignInOnUnauthorized,
} from '@pioneer/identity/data-access';
import { TableViewPreferences } from '@pioneer/identity/domain';
import { ENTRY_PREVIEWS } from '@pioneer/rules/ui/entry-previews';
import { Milliseconds } from '@pioneer/shared/kernel';
import { IdlePreloading, LocalePreferences, provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { appRoutes } from './app.routes';
import { environment } from './environment';
import { lazyEntryPreviews } from './lazy-entry-previews';
import { appMessages } from './messages';

/**
 * The frontier port over the account's views. A factory, not `useExisting`, so a change to either side's shape stops
 * compiling here, the one place that sees both; the account's schema checks what a table's change produced.
 */
function accountTableViewStore(): TableViewStore {
  const views = inject(AccountTableViews);

  return {
    stored: (entity) => views.stored(entity),
    update: async (entity, change) => views.update(entity, (current) => TableViewPreferences.parse(change(current))),
  };
}

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
    // A table that names its entity keeps its columns and density on the signed-in account.
    { provide: TableViewStore, useFactory: accountTableViewStore },
    // Every page that gives no previews of its own still opens a card for a reference.
    { provide: ENTRY_PREVIEWS, useFactory: lazyEntryPreviews },
    { provide: DISTANCE_UNIT, useFactory: () => inject(LocalePreferences).distanceUnit },
    ...environment.providers,
  ],
};
