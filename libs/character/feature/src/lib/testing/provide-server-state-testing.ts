import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { prebuildContentTesting, provideContentTesting, TestContentDelivery } from '@pioneer/rules/data-access/testing';
import type { PackContentsLoader } from '@pioneer/rules/sdk';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { TEST_PACKS } from './test-packs';

/**
 * HTTP backed by `HttpTestingController`, a fresh TanStack Query cache that never retries, and the official packs'
 * content bundles served from memory (`base`, `TEST_PACKS` unless given), with `extraPacks` beside them.
 */
export function provideServerStateTesting(
  extraPacks: readonly PackContentsLoader[] = [],
  base: readonly PackContentsLoader[] = TEST_PACKS,
): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
    ...provideContentTesting(new TestContentDelivery([...base, ...extraPacks])),
  ];
}

/** Builds what `provideServerStateTesting(extraPacks, base)` serves, before a page opens and its test starts waiting. */
export async function prebuildServerStateTesting(
  extraPacks: readonly PackContentsLoader[] = [],
  base: readonly PackContentsLoader[] = TEST_PACKS,
): Promise<void> {
  await prebuildContentTesting([...base, ...extraPacks]);
}

/**
 * How long a spec's `beforeAll` may take to run `prebuildServerStateTesting`: loading, checking and bundling the
 * official packs takes seconds on a busy CI runner, longer than a test's own timeout.
 */
export const PREBUILD_TIMEOUT = 60_000;
