import type { CharacterId, Companion, CompanionArchiveReason, CompanionId } from '@pioneer/character/domain';
import type { Temporal, UserId, Version } from '@pioneer/shared/kernel';

/** The character version a companion write was made against, and who made it when. */
export interface CompanionWriteContext {
  readonly actor: UserId;
  readonly characterId: CharacterId;
  /** The version the owner read; a write bumps it, and a stale one is a `VersionConflictError`. */
  readonly expectedVersion: Version;
  readonly at: Temporal.Instant;
}

/** The companion to archive, and why. */
export interface CompanionArchival {
  readonly id: CompanionId;
  readonly reason: CompanionArchiveReason;
}

/**
 * Port for the companions a character owns (ADR-0079). A write shares the character's transaction and bumps its
 * `version`, so one optimistic lock guards the whole build. A companion is archived, never deleted (ADR-0062).
 * Adapters live in `character-infrastructure`; the in-memory one is for tests.
 */
export abstract class CharacterCompanionRepository {
  /** The character's live companions, then its archived ones newest first. */
  public abstract listForCharacter(characterId: CharacterId): Promise<ReadonlyArray<Companion>>;

  /**
   * Insert `companion`. Throws `ConflictError` while the character holds a live companion of its kind, and
   * `VersionConflictError` when the character changed since `expectedVersion`.
   */
  public abstract add(context: CompanionWriteContext, companion: Companion): Promise<void>;

  /** Archive the live companion; one already archived or missing is no change. */
  public abstract archive(context: CompanionWriteContext, archival: CompanionArchival): Promise<void>;

  /**
   * Clear the archive mark. Throws `ConflictError` while another live companion holds its kind's place; a live or
   * missing companion is no change.
   */
  public abstract restore(context: CompanionWriteContext, id: CompanionId): Promise<void>;
}
