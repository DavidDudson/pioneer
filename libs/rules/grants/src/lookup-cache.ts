import { unsupportedPacksOf } from '@pioneer/rules/sdk';
import type { ContentPackId, ContentRegistry } from '@pioneer/rules/sdk';

import type { ContentLookup } from './grant-entry';

/** The lookups built for a registry, by `legacyContent`, and the packs and unsupported packs they were built for. */
interface BuiltLookups {
  readonly packs: number;
  readonly unsupported: ReadonlySet<ContentPackId>;
  readonly byLegacyContent: Map<boolean, ContentLookup>;
}

const built = new WeakMap<ContentRegistry, BuiltLookups>();

/**
 * The lookup `build` makes for a registry and `legacyContent`, built once: a loaded registry does not change. It is
 * built again if a pack is registered, or the registry's unsupported packs change, since.
 */
export function memoizedLookup(
  registry: ContentRegistry,
  legacyContent: boolean,
  build: (unsupported: ReadonlySet<ContentPackId>) => ContentLookup,
): ContentLookup {
  const packs = registry.packs.length;
  const unsupported = unsupportedPacksOf(registry);
  let lookups = built.get(registry);
  if (lookups?.packs !== packs || lookups.unsupported !== unsupported) {
    lookups = { packs, unsupported, byLegacyContent: new Map() };
    built.set(registry, lookups);
  }
  let lookup = lookups.byLegacyContent.get(legacyContent);
  if (lookup === undefined) {
    lookup = build(unsupported);
    lookups.byLegacyContent.set(legacyContent, lookup);
  }
  return lookup;
}
