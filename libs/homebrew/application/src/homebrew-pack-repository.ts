import type { HomebrewCommand, HomebrewPack } from '@pioneer/homebrew/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';
import type { AuditContext, Temporal, UserId } from '@pioneer/shared/kernel';

/** Who archived or restored a pack, and by which command, as the audit log records it. */
export type HomebrewAudit = AuditContext<HomebrewCommand>;

/** What an archive or restore is stamped with, and the check it runs once the pack is locked. */
export interface GuardedChange {
  readonly audit: HomebrewAudit;
  /** Runs with the pack locked and before the mark is stored; if it throws, nothing is stored. */
  readonly whileLocked?: () => Promise<void>;
}

/**
 * Port for homebrew pack persistence. Adapters live in `homebrew-infrastructure`;
 * `InMemoryHomebrewPackRepository` is for tests.
 */
export abstract class HomebrewPackRepository {
  /** The live packs `ownerId` owns, newest first; pack id breaks ties. */
  public abstract listOwnedBy(ownerId: UserId): Promise<readonly HomebrewPack[]>;

  /** The archived packs `ownerId` owns (ADR-0062), in the same order. */
  public abstract listArchivedOwnedBy(ownerId: UserId): Promise<readonly HomebrewPack[]>;

  /**
   * Any live homebrew pack; an archived one reads as missing. The service applies the access policy. Official packs
   * have no owner and are never found.
   */
  public abstract findById(id: ContentPackId): Promise<HomebrewPack | undefined>;

  /** Any archived homebrew pack; a live one reads as missing here. */
  public abstract findArchivedById(id: ContentPackId): Promise<HomebrewPack | undefined>;

  /**
   * Marks a live pack archived at `now`, leaving its version, entries and dependencies alone. A no-op if it already
   * is. its `whileLocked` check runs once the pack is locked against concurrent changes.
   */
  public abstract archive(id: ContentPackId, now: Temporal.Instant, guarded: GuardedChange): Promise<void>;

  /** Clears the archived mark, guarded as `archive` is. A no-op if the pack is live. */
  public abstract restore(id: ContentPackId, guarded: GuardedChange): Promise<void>;

  /**
   * Insert a new pack. Undefined when its slug is already in use by any pack, official or homebrew, so two
   * creations racing for one slug cannot both succeed.
   */
  public abstract insert(pack: HomebrewPack): Promise<HomebrewPack | undefined>;

  /**
   * Store the pack's new visibility and time. Undefined when its owner has no such live homebrew pack (official packs
   * never do), so an official pack cannot be changed through here. `whileLocked` runs once the pack is locked
   * against concurrent enablement and before the change is stored; if it throws, nothing is stored.
   */
  public abstract updateVisibility(
    pack: HomebrewPack,
    whileLocked?: () => Promise<void>,
  ): Promise<HomebrewPack | undefined>;
}
