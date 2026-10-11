import { contentId, ContentId, ContentKind, RollOption, slugName } from '@pioneer/rules/sdk';
import type { ContentPack, ContentRegistry, PackAncestry } from '@pioneer/rules/sdk';

import type { ContentLookup, GrantEntry } from './grant-entry';

/** An ancestry as grants read it. Its definition has no rule elements until packs move onto the envelope (Epic 2.3). */
function ancestryEntry(pack: ContentPack, ancestry: PackAncestry): GrantEntry | undefined {
  const [source, ...sources] = ancestry.sources;
  if (source === undefined) {
    return undefined;
  }
  return {
    id: ContentId.parse(contentId(pack.id, ancestry.slug)),
    kind: ContentKind.Ancestry,
    slug: slugName(ancestry.slug),
    name: ancestry.name,
    rules: [],
    sources: [source, ...sources],
    rollOptions: ancestry.traits.map((trait) => RollOption.parse(`trait:${trait}`)),
  };
}

/**
 * The registry's content as grants read it. Only ancestries for now: the other kinds join as the registry holds
 * them. Built once per registry; lookups are by id and by kind.
 */
export function grantLookup(registry: ContentRegistry): ContentLookup {
  const entries = registry.packs.flatMap((pack) => pack.ancestries.flatMap((each) => ancestryEntry(pack, each) ?? []));
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const byKind = Map.groupBy(entries, (entry) => entry.kind);
  return {
    entry: (id: ContentId): GrantEntry | undefined => byId.get(id),
    ofKind: (kind: ContentKind): readonly GrantEntry[] => byKind.get(kind) ?? [],
  };
}
