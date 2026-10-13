import { ContentId } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';

import type { ContentReference, ReferenceNamer } from './content-reference';

/**
 * Names each id the registry holds by the pack and slug it came from (ADR-0005): the ancestries, creatures,
 * statistics and variant rules it indexes, and the envelope entries of every other kind. An id no loaded pack has is
 * left unnamed, so an export that uses it fails instead of writing a reference nothing could read back.
 */
export function registryNamer(registry: ContentRegistry): ReferenceNamer {
  const named = new Map<ContentId, ContentReference>();
  const indexed = [
    ...registry.ancestries(),
    ...registry.creatures(),
    ...registry.statistics(),
    ...registry.variantRules(),
  ];
  for (const { id, pack, definition } of indexed) {
    named.set(ContentId.parse(id), { source: pack.id, slug: definition.slug });
  }
  for (const pack of registry.packs) {
    for (const { id, slug } of pack.otherEntries) {
      named.set(id, { source: pack.id, slug });
    }
  }
  return (id) => named.get(id);
}
