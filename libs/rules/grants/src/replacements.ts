import { contentPackId, effectiveLicense, isLegacyLicense } from '@pioneer/rules/sdk';
import type { ContentId, ContentPackId, ContentRegistry } from '@pioneer/rules/sdk';

import type { Replacement } from './grant-entry';

/**
 * The remaster entries that replace each legacy one, by the legacy entry's id: those whose `supersedes` names it and
 * whose pack is in force and not itself legacy, as a pick can only be changed to something the character may hold.
 */
export function replacementsOf(
  registry: ContentRegistry,
  unsupported: ReadonlySet<ContentPackId>,
): ReadonlyMap<ContentId, readonly Replacement[]> {
  const replacements = new Map<ContentId, Replacement[]>();
  for (const pack of registry.packs) {
    const inForce = !unsupported.has(contentPackId(pack.id));
    for (const entry of pack.otherEntries) {
      const remaster = inForce && !isLegacyLicense(effectiveLicense(entry, pack.manifest));
      for (const legacy of remaster ? (entry.supersedes ?? []) : []) {
        replacements.set(legacy, [...(replacements.get(legacy) ?? []), { id: entry.id, name: entry.name }]);
      }
    }
  }
  return replacements;
}
