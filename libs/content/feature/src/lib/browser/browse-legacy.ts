import { effectiveLicense, isLegacyLicense } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentLicense, ContentRegistry, PackId } from '@pioneer/rules/sdk';

/** The licence each pack of the registry is published under. */
export function packLicenses(registry: ContentRegistry): ReadonlyMap<PackId, ContentLicense> {
  return new Map(registry.packs.map((pack) => [pack.id, pack.manifest.license]));
}

/** The entry is legacy content: its own licence, or its pack's, is the Open Game License. A pack not held is not. */
export function isLegacyEntry(entry: ContentEntry, licenses: ReadonlyMap<PackId, ContentLicense>): boolean {
  const license = licenses.get(entry.pack);
  return license !== undefined && isLegacyLicense(effectiveLicense(entry, { license }));
}
