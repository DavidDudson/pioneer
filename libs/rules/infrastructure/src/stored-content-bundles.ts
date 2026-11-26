import { BundleHash, bundleLocale, bundlePath, CanonicalJson, contentBundles } from '@pioneer/rules/sdk';
import type { BundleBody, BundleFile, ContentBundles, ContentManifest, PackId } from '@pioneer/rules/sdk';
import { NotFoundError, SOURCE_CONTENT_LOCALE } from '@pioneer/shared/kernel';
import type { ContentLocale } from '@pioneer/shared/kernel';

import type { ContentRepository } from './content-repository';
import { HashKeyedCache } from './hash-keyed-cache';

/** Hex digits of SHA-256 kept in a bundle's file name: 64 bits, plenty to tell one pack's bundles apart. */
const HASH_DIGITS = 16;

/** How the server names bundles: SHA-256 of their canonical JSON, cut to `HASH_DIGITS`. */
export function bundleHash(json: CanonicalJson): BundleHash {
  return BundleHash.parse(new Bun.CryptoHasher('sha256').update(json).digest('hex').slice(0, HASH_DIGITS));
}

/** Locales kept built at once: anyone can ask for any, so the least recently asked for is dropped past this. */
const KEPT_LOCALES = 8;

/**
 * The locale a build is made in: one nobody translated is built, cached and named as the source locale, so a request
 * for any two letters can neither force a rebuild nor push a real locale out of the cache.
 */
function builtIn(locale: ContentLocale, version: string): ContentLocale {
  return version === '' ? SOURCE_CONTENT_LOCALE : locale;
}

/**
 * The browser's bundles of the official packs in the content tables (content-model.md, "Delivery to the browser"),
 * built once per set of stored hashes like `StoredContentSource`'s registry, so a re-seed is served on the next ask.
 */
export class StoredContentBundles {
  readonly #repository: ContentRepository;
  readonly #caches = new Map<ContentLocale, HashKeyedCache<ContentBundles>>();

  public constructor(repository: ContentRepository) {
    this.#repository = repository;
  }

  public async manifest(locale: ContentLocale = SOURCE_CONTENT_LOCALE): Promise<ContentManifest> {
    const bundles = await this.#current(locale);

    return bundles.manifest;
  }

  /**
   * A validator for the current manifest: it changes exactly when a stored pack hash does, so a client holding it
   * can be told "not modified" without the manifest being built or sent. It also changes with the locale's text
   * (a translation edited changes no pack hash), and a locale's manifest never shares one with another's. A locale
   * with no translation shares the source locale's.
   */
  public async manifestEtag(locale: ContentLocale = SOURCE_CONTENT_LOCALE): Promise<string> {
    const [hashes, version] = await Promise.all([
      this.#repository.officialHashes(),
      this.#repository.officialTextsVersion(locale),
    ]);

    const joined = `${hashes.map(({ pack, hash }) => `${pack}:${hash}`).join(',')}|${builtIn(locale, version)}|${version}`;

    return `"${bundleHash(CanonicalJson.parse(joined))}"`;
  }

  /**
   * A current bundle's contents; `locale` is the one the file's name carries (`bundleLocale`). A file no current
   * manifest names, an older hash included, is not found.
   */
  public async bundle(pack: PackId, file: BundleFile): Promise<BundleBody> {
    const bundles = await this.#current(bundleLocale(file));
    const path = bundlePath(pack, file);
    const body = bundles.bodies.get(path);

    if (body === undefined) {
      throw new NotFoundError('Content bundle', path);
    }

    return body;
  }

  /** The cache for `locale`, now the most recently asked for; the oldest past `KEPT_LOCALES` is dropped. */
  #cacheFor(locale: ContentLocale): HashKeyedCache<ContentBundles> {
    const kept = this.#caches.get(locale) ?? new HashKeyedCache<ContentBundles>();
    this.#caches.delete(locale);
    this.#caches.set(locale, kept);

    for (const oldest of this.#caches.keys()) {
      if (this.#caches.size <= KEPT_LOCALES) {
        break;
      }

      this.#caches.delete(oldest);
    }

    return kept;
  }

  async #current(locale: ContentLocale): Promise<ContentBundles> {
    const [hashes, version] = await Promise.all([
      this.#repository.officialHashes(),
      this.#repository.officialTextsVersion(locale),
    ]);

    const cache = this.#cacheFor(builtIn(locale, version));

    // The build reads after the hashes and the version, so it is never older than the key it is cached under.
    return cache.current(
      hashes,
      async () => {
        const [packs, texts] = await Promise.all([
          this.#repository.loadOfficial(),
          this.#repository.officialTexts(locale),
        ]);

        return contentBundles(packs, bundleHash, texts);
      },
      version,
    );
  }
}
