import { contentPackFromContents, ContentRegistry } from '@pioneer/rules/sdk';
import type { ContentId, ContentPackId, ContentSource, PackContents } from '@pioneer/rules/sdk';

import type { ContentRepository } from './content-repository';
import { HashKeyedCache } from './hash-keyed-cache';
import { PackSetCache } from './pack-set-cache';

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
  readonly #sets = new PackSetCache<ContentRegistry>();

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
    return this.#sets.current(packs, [...official, ...homebrew], async () =>
      registryOf([...(await this.#repository.loadOfficial()), ...(await this.#repository.loadHomebrew(packs))]),
    );
  }

  /** The homebrew packs in force that define any of the entries with these ids. */
  public async packsOfEntries(entryIds: readonly ContentId[]): Promise<readonly ContentPackId[]> {
    return this.#repository.homebrewPacksOfEntries(entryIds);
  }

  /**
   * A registry of one pack and the packs it depends on, registered in dependency order. Built on each ask, not cached:
   * a homebrew pack changes without any official hash changing, and it is read by few.
   */
  public async registryWithDependencies(root: ContentPackId): Promise<ContentRegistry> {
    return registryOf(await this.#repository.loadWithDependencies(root));
  }
}
