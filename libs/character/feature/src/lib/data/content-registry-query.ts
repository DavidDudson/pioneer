import { inject } from '@angular/core';
import type { CharacterPacks } from '@pioneer/character/domain';
import { ContentLoader } from '@pioneer/rules/data-access';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentPackId, ContentRegistry } from '@pioneer/rules/sdk';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

import { CharacterPackStore } from './character-pack-store';

/**
 * The kinds every character page's registry holds: ancestries, heritages and backgrounds for the options and the
 * engine, the ancestry features they grant, backgrounds and classes for their boosts, classes and class features for
 * the builder, deities for their picker and the options they set, statistics for the sheet and traits for the names of
 * the character's own. One list, so the pages share one query and the registry loads once a session.
 */
export const CHARACTER_CONTENT_KINDS: readonly ContentKind[] = [
  ContentKind.Ancestry,
  ContentKind.AncestryFeature,
  ContentKind.Heritage,
  ContentKind.Background,
  ContentKind.Class,
  ContentKind.ClassFeature,
  ContentKind.Deity,
  ContentKind.Statistic,
  ContentKind.Trait,
];

/**
 * TanStack query options for a registry of every official pack's entries of some kinds, and those of the homebrew packs
 * a character uses, loaded once a session.
 */
export interface ContentRegistryQuery {
  readonly queryKey: readonly ['content', 'registry', readonly ContentKind[], readonly ContentPackId[]];
  readonly queryFn: () => Promise<ContentRegistry>;
  readonly staleTime: number;
}

/**
 * A registry of `kinds` from the content bundles, which `loader` keeps in the browser: only those kinds are fetched,
 * and a kind kept from an earlier visit needs no request. Homebrew packs come from the content the loader fetches for
 * the signed-in user, so they are never kept in the browser.
 */
export function contentRegistryQuery(
  loader: ContentLoader,
  kinds: readonly ContentKind[],
  homebrew: readonly ContentPackId[] = [],
): ContentRegistryQuery {
  return {
    queryKey: ['content', 'registry', kinds.toSorted(), homebrew.toSorted()],
    queryFn: async (): Promise<ContentRegistry> => loader.registry(kinds, homebrew),
    staleTime: Number.POSITIVE_INFINITY,
  };
}

/** The homebrew packs a character uses: the ones in its pack list that are not official. */
function homebrewOf(packs: CharacterPacks | undefined): readonly ContentPackId[] {
  return (packs?.enabled ?? []).filter((pack) => !pack.official).map((pack) => pack.packId);
}

/**
 * The registry of `kinds` as a query, in an injection context: the loader and the query in one call. It loads only
 * while `enabled` says so, read reactively: the sheet loads the item kinds once a character has equipment. On the
 * sheet it holds the homebrew packs the character uses (its campaign's, else its own).
 */
export function injectContentRegistry(
  kinds: readonly ContentKind[],
  enabled: () => boolean = (): boolean => true,
): CreateQueryResult<ContentRegistry> {
  const loader = inject(ContentLoader);
  const packs = inject(CharacterPackStore, { optional: true });
  return injectQuery(() => {
    // Off the sheet nothing is homebrew. On it the registry waits for the pack list, to build once over the right packs.
    const listing = packs?.packs;
    const waiting = listing?.isPending() === true;
    return { ...contentRegistryQuery(loader, kinds, homebrewOf(listing?.data())), enabled: enabled() && !waiting };
  });
}
