import { BundleFile } from '@pioneer/rules/sdk';
import type { BookLabel, ContentManifest, PackId } from '@pioneer/rules/sdk';

import type { LegalImport } from '../legal-imports';

/** One bundle a pack offers for download: its file name already carries the kind and the content hash. */
interface CacheFile {
  readonly file: BundleFile;
  readonly bytes: number;
}

/** One official pack as the content caches list it. */
export interface CachePack {
  readonly id: PackId;
  /** The book title key of an imported pack; absent for a pack with no book, such as the core rules. */
  readonly titleKey: BookLabel | undefined;
  /** The Foundry release the pack was imported from, when it was. */
  readonly release: string | undefined;
  readonly bytes: number;
  readonly files: readonly CacheFile[];
}

function byFileName(left: CacheFile, right: CacheFile): number {
  return left.file < right.file ? -1 : 1;
}

/**
 * The caches the manifest offers, a pack at a time in manifest order, each with its bundles by file name and its total
 * size. A pack whose manifest has no sizes (an older build's) lists no files.
 */
export function cachePacks(manifest: ContentManifest, imports: readonly LegalImport[]): readonly CachePack[] {
  const imported = new Map(imports.map((each) => [each.pack, each]));
  return manifest.packs.map((pack): CachePack => {
    const files = Object.entries(pack.sizes ?? {})
      .map(([file, bytes]): CacheFile => ({ file: BundleFile.parse(file), bytes }))
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
