import { BundleHash, bundlePath, CanonicalJson, contentBundles } from '@pioneer/rules/sdk';
import type { BundleBody, BundleFile, ContentBundles, ContentManifest, PackId } from '@pioneer/rules/sdk';
import { NotFoundError } from '@pioneer/shared/kernel';

import type { ContentRepository } from './content-repository';
import { HashKeyedCache } from './hash-keyed-cache';

/** Hex digits of SHA-256 kept in a bundle's file name: 64 bits, plenty to tell one pack's bundles apart. */
const HASH_DIGITS = 16;

/** How the server names bundles: SHA-256 of their canonical JSON, cut to `HASH_DIGITS`. */
export function bundleHash(json: CanonicalJson): BundleHash {
  return BundleHash.parse(new Bun.CryptoHasher('sha256').update(json).digest('hex').slice(0, HASH_DIGITS));
}

/**
 * The browser's bundles of the official packs in the content tables (content-model.md, "Delivery to the browser"),
 * built once per set of stored hashes like `StoredContentSource`'s registry, so a re-seed is served on the next ask.
 */
export class StoredContentBundles {
  readonly #repository: ContentRepository;
  readonly #cache = new HashKeyedCache<ContentBundles>();

  public constructor(repository: ContentRepository) {
    this.#repository = repository;
  }

  public async manifest(): Promise<ContentManifest> {
    const bundles = await this.#current();
    return bundles.manifest;
  }

  /**
   * A validator for the current manifest: it changes exactly when a stored pack hash does, so a client holding it
   * can be told "not modified" without the manifest being built or sent.
   */
  public async manifestEtag(): Promise<string> {
    const hashes = await this.#repository.officialHashes();
    const joined = hashes.map(({ pack, hash }) => `${pack}:${hash}`).join(',');
    return `"${bundleHash(CanonicalJson.parse(joined))}"`;
  }

  /** A current bundle's contents. A file no current manifest names, an older hash included, is not found. */
  public async bundle(pack: PackId, file: BundleFile): Promise<BundleBody> {
    const bundles = await this.#current();
    const path = bundlePath(pack, file);
    const body = bundles.bodies.get(path);
    if (body === undefined) {
      throw new NotFoundError('Content bundle', path);
    }
    return body;
  }

  async #current(): Promise<ContentBundles> {
    const hashes = await this.#repository.officialHashes();
    // The build reads after the hashes, so it is never older than the key it is cached under.
    return this.#cache.current(hashes, async () => {
      const packs = await this.#repository.loadOfficial();
      return contentBundles(packs, bundleHash);
    });
  }
}
