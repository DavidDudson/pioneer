import { ACTION_FACETS, FEAT_FACETS } from './action-facets';
import { COMMON_FACETS } from './facet';
import type { FacetDefinition, FacetId } from './facet';
import type { RegisteredKind } from './kind-data';
import { SPELL_FACETS } from './spell-facets';

/**
 * Facets a kind adds to the common ones. A kind joins here alongside its schema (`kind-data.ts`) when its facets
 * are defined.
 */
const KIND_FACETS: Readonly<Partial<Record<RegisteredKind, readonly FacetDefinition[]>>> = {
  action: ACTION_FACETS,
  feat: FEAT_FACETS,
  spell: SPELL_FACETS,
};

/** The facets for a list holding `kinds`: the common ones, then each kind's own, each facet once. */
export function facetsFor(kinds: readonly RegisteredKind[]): readonly FacetDefinition[] {
  const byId = new Map<FacetId, FacetDefinition>(COMMON_FACETS.map((facet) => [facet.id, facet]));
  for (const kind of kinds) {
    for (const facet of KIND_FACETS[kind] ?? []) {
      byId.set(facet.id, facet);
    }
  }
  return [...byId.values()];
}
