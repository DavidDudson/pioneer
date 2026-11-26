import { contentBundles } from '@pioneer/rules/sdk';
import type { ContentBundles, ContentPackId } from '@pioneer/rules/sdk';
import { SOURCE_CONTENT_LOCALE } from '@pioneer/shared/kernel';
import type { ContentLocale } from '@pioneer/shared/kernel';

import type { ContentRepository } from './content-repository';
import { PackSetCache } from './pack-set-cache';
import { bundleHash } from './stored-content-bundles';

/**
 * The browser's bundles of homebrew packs (content-model.md, "Delivery to the browser"): the packs asked for and the
 * packs they extend, built per set of packs under the stored hashes of all of them, as `StoredContentSource` builds a
 * registry. It decides nothing about who may read a pack: the caller applies `PackAccessPolicy`.
 */
export class StoredPackBundles {
  readonly #repository: ContentRepository;
  readonly #sets = new PackSetCache<ContentBundles>();

  public constructor(repository: ContentRepository) {
    this.#repository = repository;
  }

  public async of(
    packs: readonly ContentPackId[],
    locale: ContentLocale = SOURCE_CONTENT_LOCALE,
  ): Promise<ContentBundles> {
    const [hashes, version] = await Promise.all([
      this.#repository.homebrewHashes(packs),
      this.#repository.homebrewTextsVersion(locale, packs),
    ]);

    // The build reads after the hashes and the version, so it is never older than the key it is cached under. A
    // Translation edited changes no pack hash, so the locale's text version is part of the key.
    return this.#sets.current({ packs, variant: `${locale}|${version}` }, hashes, async () => {
      const [contents, texts] = await Promise.all([
        this.#repository.loadHomebrew(packs),
        this.#repository.homebrewTexts(locale, packs),
      ]);

      return contentBundles(contents, bundleHash, texts);
    });
  }
}
