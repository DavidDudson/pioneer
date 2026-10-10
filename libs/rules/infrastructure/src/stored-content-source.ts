import { contentPackFromContents, ContentRegistry } from '@pioneer/rules/sdk';
import type { ContentSource } from '@pioneer/rules/sdk';

import type { ContentRepository, StoredPackHash } from './content-repository';

/** A registry being built or built, and the stored hashes it was asked for under. */
interface CachedRegistry {
  readonly key: string;
  readonly registry: Promise<ContentRegistry>;
}

function cacheKey(hashes: readonly StoredPackHash[]): string {
  return hashes.map(({ pack, hash }) => `${pack}:${hash}`).join(',');
}

/**
 * The official packs in the content tables, as one `ContentRegistry` per process. Each ask reads the stored hashes
 * first, so a re-seed (or a pack added or removed) rebuilds the registry on the next ask and an unchanged one is
 * shared. Concurrent asks share one build; a failed build is dropped, so the next ask tries again.
 */
export class StoredContentSource implements ContentSource {
  readonly #repository: ContentRepository;
  #cached: CachedRegistry | undefined;

  public constructor(repository: ContentRepository) {
    this.#repository = repository;
  }

  public async registry(): Promise<ContentRegistry> {
    const hashes = await this.#repository.officialHashes();
    const key = cacheKey(hashes);
    // The build reads after the hashes, so it is never older than the key it is cached under.
    const cached = this.#cached?.key === key ? this.#cached : { key, registry: this.#build() };
    this.#cached = cached;
    try {
      return await cached.registry;
    } catch (error) {
      if (this.#cached === cached) {
        this.#cached = undefined;
      }
      throw error;
    }
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
