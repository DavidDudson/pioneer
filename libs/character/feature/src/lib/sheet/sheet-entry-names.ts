import { ContentId } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';

/** The display name of every entry in the registry, so the sheet's origin chains name what they come from. */
export function sheetEntryNames(registry: ContentRegistry): ReadonlyMap<ContentId, string> {
  const entries = [
    ...registry.ancestries(),
    ...registry.creatures(),
    ...registry.statistics(),
    ...registry.variantRules(),
  ];
  const named = new Map(entries.map((entry) => [ContentId.parse(entry.id), entry.definition.name]));
  for (const entry of registry.packs.flatMap((pack) => pack.otherEntries)) {
    named.set(entry.id, entry.name);
  }
  return named;
}
