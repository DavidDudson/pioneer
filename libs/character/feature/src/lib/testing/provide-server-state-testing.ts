import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { officialPacks } from '@pioneer/rules/catalog';
import { provideContentTesting, TestContentDelivery } from '@pioneer/rules/data-access/testing';
import type { PackContentsLoader } from '@pioneer/rules/sdk';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';

/**
 * HTTP backed by `HttpTestingController`, a fresh TanStack Query cache that never retries, and the official packs'
 * content bundles served from memory, with `extraPacks` beside them.
 */
export function provideServerStateTesting(
  extraPacks: readonly PackContentsLoader[] = [],
): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
    ...provideContentTesting(new TestContentDelivery([...officialPacks, ...extraPacks])),
  ];
}
