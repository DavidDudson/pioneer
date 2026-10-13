import type { HomebrewPack } from '@pioneer/homebrew/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Port for homebrew pack persistence. Adapters live in `homebrew-infrastructure`;
 * `InMemoryHomebrewPackRepository` is for tests.
 */
export abstract class HomebrewPackRepository {
  /** The packs `ownerId` owns, newest first; pack id breaks ties. */
  public abstract listOwnedBy(ownerId: UserId): Promise<readonly HomebrewPack[]>;

  /** Any homebrew pack; the service applies the access policy. Official packs have no owner and are never found. */
  public abstract findById(id: ContentPackId): Promise<HomebrewPack | undefined>;

  /**
   * Insert a new pack. Undefined when its slug is already in use by any pack, official or homebrew, so two
   * creations racing for one slug cannot both succeed.
   */
  public abstract insert(pack: HomebrewPack): Promise<HomebrewPack | undefined>;

  /**
   * Store the pack's new visibility and time. Undefined when its owner has no such homebrew pack (official packs
   * never do), so an official pack cannot be changed through here. `whileLocked` runs once the pack is locked
   * against concurrent enablement and before the change is stored; if it throws, nothing is stored.
   */
  public abstract updateVisibility(
    pack: HomebrewPack,
    whileLocked?: () => Promise<void>,
  ): Promise<HomebrewPack | undefined>;
}
