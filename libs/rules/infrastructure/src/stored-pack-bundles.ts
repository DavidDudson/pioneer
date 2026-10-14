import { contentBundles } from '@pioneer/rules/sdk';
import type { ContentBundles, ContentPackId } from '@pioneer/rules/sdk';

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

  public async of(packs: readonly ContentPackId[]): Promise<ContentBundles> {
    const hashes = await this.#repository.homebrewHashes(packs);
    // The build reads after the hashes, so it is never older than the key it is cached under.
    return this.#sets.current(packs, hashes, async () =>
      contentBundles(await this.#repository.loadHomebrew(packs), bundleHash),
    );
  }
}
