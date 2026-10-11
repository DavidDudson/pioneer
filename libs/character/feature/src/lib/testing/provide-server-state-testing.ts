import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { playerCoreClassEntries } from '@pioneer/character/domain/testing';
import { officialPacks } from '@pioneer/rules/catalog';
import { provideContentTesting, TestContentDelivery } from '@pioneer/rules/data-access/testing';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';

/** The official packs with Player Core's classes added, which its pack lacks until its import lands (#401). */
export const PACKS_WITH_CLASSES: readonly PackContentsLoader[] = officialPacks.map((pack): PackContentsLoader =>
  pack.id === 'player-core'
    ? {
        id: pack.id,
        load: async (): Promise<PackContents> => {
          const contents = await pack.load();
          return { ...contents, entries: [...contents.entries, ...playerCoreClassEntries()] };
        },
      }
    : pack,
);

/**
 * HTTP backed by `HttpTestingController`, a fresh TanStack Query cache that never retries, and the official packs'
 * content bundles served from memory (`base`, the official packs unless given), with `extraPacks` beside them.
 */
export function provideServerStateTesting(
  extraPacks: readonly PackContentsLoader[] = [],
  base: readonly PackContentsLoader[] = officialPacks,
): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
    ...provideContentTesting(new TestContentDelivery([...base, ...extraPacks])),
  ];
}
