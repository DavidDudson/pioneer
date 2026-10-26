import type { BookLabel, BundleFile, PackId } from '@pioneer/rules/sdk';

/** One bundle a pack offers for download: its file name already carries the kind and the content hash. */
export interface CacheFile {
  readonly file: BundleFile;
  readonly bytes: number;
  /** Where it downloads from, absolute so it links as a plain document. */
  readonly url: string;
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
