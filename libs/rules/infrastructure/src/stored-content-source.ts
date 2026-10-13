import { contentPackFromContents, ContentRegistry } from '@pioneer/rules/sdk';
import type { ContentPackId, ContentSource } from '@pioneer/rules/sdk';

import type { ContentRepository } from './content-repository';
import { HashKeyedCache } from './hash-keyed-cache';

/**
 * The official packs in the content tables, as one `ContentRegistry` per process. Each ask reads the stored hashes
 * first, so a re-seed (or a pack added or removed) rebuilds the registry on the next ask and an unchanged one is
 * shared. Concurrent asks share one build; a failed build is dropped, so the next ask tries again.
 */
export class StoredContentSource implements ContentSource {
  readonly #repository: ContentRepository;
  readonly #cache = new HashKeyedCache<ContentRegistry>();

  public constructor(repository: ContentRepository) {
    this.#repository = repository;
  }

  public async registry(): Promise<ContentRegistry> {
    const hashes = await this.#repository.officialHashes();
    // The build reads after the hashes, so it is never older than the key it is cached under.
    return this.#cache.current(hashes, async () => this.#build());
  }

  /**
   * A registry of one pack and the packs it depends on, registered in dependency order. Built on each ask, not cached:
   * a homebrew pack changes without any official hash changing, and it is read by few.
   */
  public async registryWithDependencies(root: ContentPackId): Promise<ContentRegistry> {
    const registry = new ContentRegistry();
    for (const contents of await this.#repository.loadWithDependencies(root)) {
      registry.register(contentPackFromContents(contents));
    }
    return registry;
  }

  async #build(): Promise<ContentRegistry> {
    const packs = await this.#repository.loadOfficial();
    const registry = new ContentRegistry();
    for (const contents of packs) {
      registry.register(contentPackFromContents(contents));
    }
    return registry;
  }
}
