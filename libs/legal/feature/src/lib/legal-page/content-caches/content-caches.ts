import type { CacheFile, CachePack } from '@pioneer/legal/ui';
import { BundleFile } from '@pioneer/rules/sdk';
import type { ContentManifest, PackId } from '@pioneer/rules/sdk';

import type { LegalImport } from '../legal-imports';

/** Where a bundle of a pack downloads from. */
export type DownloadUrl = (pack: PackId, file: BundleFile) => string;

function byFileName(left: CacheFile, right: CacheFile): number {
  return left.file < right.file ? -1 : 1;
}

/**
 * The caches the manifest offers, a pack at a time in manifest order, each with its bundles by file name and its total
 * size. A pack whose manifest has no sizes (an older build's) lists no files.
 */
export function cachePacks(
  manifest: ContentManifest,
  imports: readonly LegalImport[],
  downloadUrl: DownloadUrl,
): readonly CachePack[] {
  const imported = new Map(imports.map((each) => [each.pack, each]));
  return manifest.packs.map((pack): CachePack => {
    const files = Object.entries(pack.sizes ?? {})
      .map(([name, bytes]): CacheFile => {
        const file = BundleFile.parse(name);
        return { file, bytes, url: downloadUrl(pack.id, file) };
      })
      .toSorted(byFileName);
    const origin = imported.get(pack.id);
    return {
      id: pack.id,
      titleKey: origin?.titleKey,
      release: origin?.release,
      bytes: files.reduce((total, { bytes }) => total + bytes, 0),
      files,
    };
  });
}
