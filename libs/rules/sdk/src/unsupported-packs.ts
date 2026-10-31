import type { ContentPackId } from './content-id';
import type { ContentRegistry } from './content-registry';

/**
 * The packs a registry holds that are no longer in force for the character it was built for: a campaign disabled them,
 * but the character still holds content from them. The browser builds a registry per character, so the set rides with
 * the registry (like the variant rules in force); what reads it flags the entries as unsupported.
 */
const UNSUPPORTED = new WeakMap<ContentRegistry, ReadonlySet<ContentPackId>>();

/** Records which of the registry's packs are unsupported. */
export function putUnsupportedPacks(registry: ContentRegistry, packs: readonly ContentPackId[]): void {
  UNSUPPORTED.set(registry, new Set(packs));
}

const NONE: ReadonlySet<ContentPackId> = new Set();

/** The registry's unsupported packs; none for a registry built for no character. */
export function unsupportedPacksOf(registry: ContentRegistry): ReadonlySet<ContentPackId> {
  return UNSUPPORTED.get(registry) ?? NONE;
}
