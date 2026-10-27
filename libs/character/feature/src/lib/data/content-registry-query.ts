import { inject } from '@angular/core';
import type { CharacterPacks, CharacterVariantRules } from '@pioneer/character/domain';
import { ContentLoader } from '@pioneer/rules/data-access';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentPackId, ContentRegistry, VariantRuleId } from '@pioneer/rules/sdk';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

import { CharacterPackStore } from './character-pack-store';
import { CharacterVariantStore } from './character-variant-store';
import { putVariantsInForce } from './registry-variants';

/**
 * The kinds every character page's registry holds: ancestries, heritages and backgrounds for the options and the
 * engine, the ancestry features they grant, languages for the names an ancestry lists, senses for the names of what
 * the character perceives, backgrounds and classes for their boosts, classes and class features for the builder, deities for their picker and the options they set,
 * statistics for the sheet and traits for the names of the character's own. One list, so the pages share one query and the registry loads once a session.
 */
export const CHARACTER_CONTENT_KINDS: readonly ContentKind[] = [
  ContentKind.Ancestry,
  ContentKind.AncestryFeature,
  ContentKind.Heritage,
  ContentKind.Language,
  ContentKind.Sense,
  ContentKind.Background,
  ContentKind.Class,
  ContentKind.ClassFeature,
  ContentKind.Deity,
  ContentKind.Statistic,
  ContentKind.Trait,
];

/**
 * TanStack query options for a registry of every official pack's entries of some kinds, and those of the homebrew packs
 * a character uses, loaded once a session. The registry also holds which variant rules are in force for the character
 * it was built for (`variantsInForce`), so the key names them.
 */
export interface ContentRegistryQuery {
  readonly queryKey: readonly [
    'content',
    'registry',
    readonly ContentKind[],
    readonly ContentPackId[],
    readonly VariantRuleId[],
  ];
  readonly queryFn: () => Promise<ContentRegistry>;
  readonly staleTime: number;
}

/** The packs and variant rules a character's registry is built over. */
export interface CharacterContentSet {
  /** The homebrew packs the character uses. */
  readonly homebrew: readonly ContentPackId[];
  /** The variant rules enabled for it. */
  readonly variants: readonly VariantRuleId[];
}

const NO_CONTENT: CharacterContentSet = { homebrew: [], variants: [] };

/**
 * A registry of `kinds` from the content bundles, which `loader` keeps in the browser: only those kinds are fetched,
 * and a kind kept from an earlier visit needs no request. Homebrew packs come from the content the loader fetches for
 * the signed-in user, so they are never kept in the browser. The enabled variant rules are recorded on the registry.
 */
export function contentRegistryQuery(
  loader: ContentLoader,
  kinds: readonly ContentKind[],
  { homebrew, variants }: CharacterContentSet = NO_CONTENT,
): ContentRegistryQuery {
  return {
    queryKey: ['content', 'registry', kinds.toSorted(), homebrew.toSorted(), variants.toSorted()],
    queryFn: async (): Promise<ContentRegistry> => {
      const registry = await loader.registry(kinds, homebrew);
      putVariantsInForce(registry, variants);
      return registry;
    },
    staleTime: Number.POSITIVE_INFINITY,
  };
}

/** The homebrew packs a character uses: the ones in its pack list that are not official. */
function homebrewOf(packs: CharacterPacks | undefined): readonly ContentPackId[] {
  return (packs?.enabled ?? []).filter((pack) => !pack.official).map((pack) => pack.packId);
}

/** The variant rules enabled for a character: the ones in its list. */
function variantsOf(rules: CharacterVariantRules | undefined): readonly VariantRuleId[] {
  return (rules?.enabled ?? []).map((rule) => rule.variantId);
}

/**
 * The registry of `kinds` as a query, in an injection context: the loader and the query in one call. It loads only
 * while `enabled` says so, read reactively: the sheet loads the item kinds once a character has equipment. On the
 * sheet it holds the homebrew packs the character uses (its campaign's, else its own) and the variant rules enabled for
 * it, so its kinds include variant rules.
 */
export function injectContentRegistry(
  kinds: readonly ContentKind[],
  enabled: () => boolean = (): boolean => true,
): CreateQueryResult<ContentRegistry> {
  const loader = inject(ContentLoader);
  const packs = inject(CharacterPackStore, { optional: true });
  const variants = inject(CharacterVariantStore, { optional: true });
  return injectQuery(() => {
    // Off the sheet nothing is homebrew and no variant rule is on. On it the registry waits for both lists.
    // It then builds once, over the right packs and variant rules.
    const listing = packs?.packs;
    const enabledVariants = variants?.rules;
    const waiting = listing?.isPending() === true || enabledVariants?.isPending() === true;
    const content = { homebrew: homebrewOf(listing?.data()), variants: variantsOf(enabledVariants?.data()) };
    const loaded = variants === null ? kinds : [...new Set([...kinds, ContentKind.VariantRule])];
    return { ...contentRegistryQuery(loader, loaded, content), enabled: enabled() && !waiting };
  });
}
