import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';

/** HTTP backed by `HttpTestingController`, and a fresh TanStack Query cache that never retries. */
export function provideServerStateTesting(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
  ];
}
