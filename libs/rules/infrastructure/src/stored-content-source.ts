import { contentPackFromContents, ContentRegistry } from '@pioneer/rules/sdk';
import type { ContentPackId, ContentSource, PackContents } from '@pioneer/rules/sdk';

import type { ContentRepository } from './content-repository';
import { HashKeyedCache } from './hash-keyed-cache';

/** Sets of homebrew packs kept built at once. Past this the one asked for longest ago is dropped and built again. */
const KEPT_SETS = 64;

/** The registry of `packs`, registered in order. */
function registryOf(packs: readonly PackContents[]): ContentRegistry {
  const registry = new ContentRegistry();
  for (const contents of packs) {
    registry.register(contentPackFromContents(contents));
  }
  return registry;
}

/**
 * The packs in the content tables, as one `ContentRegistry` per set of packs. Without homebrew packs that is the
 * official ones, shared by the process. With them it is the official packs and the homebrew packs given (a
 * character's or a campaign's, with what they extend), cached per set under the stored hashes of all of them. Each ask
 * reads the hashes first, so a re-seed (or a pack added, removed or edited) rebuilds the registry on the next ask and
 * an unchanged one is shared. Concurrent asks share one build; a failed build is dropped, so the next ask tries again.
 */
export class StoredContentSource implements ContentSource {
  readonly #repository: ContentRepository;
  readonly #official = new HashKeyedCache<ContentRegistry>();
  /** By the ids of the packs asked for, oldest ask first; each is keyed by the hashes it was built under. */
  readonly #sets = new Map<string, HashKeyedCache<ContentRegistry>>();

  public constructor(repository: ContentRepository) {
    this.#repository = repository;
  }

  public async registry(packs: readonly ContentPackId[] = []): Promise<ContentRegistry> {
    if (packs.length === 0) {
      const hashes = await this.#repository.officialHashes();
      // The build reads after the hashes, so it is never older than the key it is cached under.
      return this.#official.current(hashes, async () => registryOf(await this.#repository.loadOfficial()));
    }
    const [official, homebrew] = await Promise.all([
      this.#repository.officialHashes(),
      this.#repository.homebrewHashes(packs),
    ]);
    return this.#setCache(packs).current([...official, ...homebrew], async () =>
      registryOf([...(await this.#repository.loadOfficial()), ...(await this.#repository.loadHomebrew(packs))]),
    );
  }

  /**
   * A registry of one pack and the packs it depends on, registered in dependency order. Built on each ask, not cached:
   * a homebrew pack changes without any official hash changing, and it is read by few.
   */
  public async registryWithDependencies(root: ContentPackId): Promise<ContentRegistry> {
    return registryOf(await this.#repository.loadWithDependencies(root));
  }

  /** The cache for this set of packs, in any order, and the most recently asked for. */
  #setCache(packs: readonly ContentPackId[]): HashKeyedCache<ContentRegistry> {
    const key = [...new Set(packs)].toSorted().join(',');
    const kept = this.#sets.get(key) ?? new HashKeyedCache<ContentRegistry>();
    this.#sets.delete(key);
    this.#sets.set(key, kept);
    for (const oldest of this.#sets.keys()) {
      if (this.#sets.size <= KEPT_SETS) {
        break;
      }
      this.#sets.delete(oldest);
    }
    return kept;
  }
}
