import type { BrowseReplacement } from '@pioneer/content/ui';
import { effectiveLicense, isLegacyLicense } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentLicense, ContentRegistry, PackId } from '@pioneer/rules/sdk';
import { entryTarget } from '@pioneer/rules/ui';

/** The licence each pack of the registry is published under. */
export function packLicenses(registry: ContentRegistry): ReadonlyMap<PackId, ContentLicense> {
  return new Map(registry.packs.map((pack) => [pack.id, pack.manifest.license]));
}

/** The entry is legacy content: its own licence, or its pack's, is the Open Game License. A pack not held is not. */
export function isLegacyEntry(entry: ContentEntry, licenses: ReadonlyMap<PackId, ContentLicense>): boolean {
  const license = licenses.get(entry.pack);
  return license !== undefined && isLegacyLicense(effectiveLicense(entry, { license }));
}

/** `entries` as a page with legacy content `on` shows them: all of them, or only the remaster ones. */
export function shownEntries<Entry extends ContentEntry>(
  entries: readonly Entry[],
  licenses: ReadonlyMap<PackId, ContentLicense>,
  on: boolean,
): readonly Entry[] {
  return on ? entries : entries.filter((entry) => !isLegacyEntry(entry, licenses));
}

/** For each legacy entry the `entries` replace, the remaster entries that say so in `supersedes`, in list order. */
export function replacementsOf(entries: readonly ContentEntry[]): ReadonlyMap<ContentId, readonly ContentEntry[]> {
  const replaced = new Map<ContentId, ContentEntry[]>();
  for (const entry of entries) {
    for (const legacy of entry.supersedes ?? []) {
      replaced.set(legacy, [...(replaced.get(legacy) ?? []), entry]);
    }
  }
  return replaced;
}

/** The replacements of `entry` as the list shows them: each one's name and where it opens. */
export function replacedBy(
  entry: ContentEntry,
  replacements: ReadonlyMap<ContentId, readonly ContentEntry[]>,
): readonly BrowseReplacement[] {
  return (replacements.get(entry.id) ?? []).map((replacement) => ({
    name: replacement.name,
    to: entryTarget(replacement),
  }));
}
