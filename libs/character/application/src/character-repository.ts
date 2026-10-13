import type {
  Character,
  CharacterCommand,
  CharacterId,
  CharacterListQuery,
  CharacterPlay,
  PlayState,
} from '@pioneer/character/domain';
import type { AuditContext, Temporal, UserId, Version } from '@pioneer/shared/kernel';

/** Who wrote a character and with which command; lands on its `audit.log` rows. */
export type CharacterAudit = AuditContext<CharacterCommand>;

/** A play-state write: the character, its new play state, the revision it was read at, and who wrote it when. */
export interface PlayWrite {
  readonly id: CharacterId;
  readonly play: PlayState;
  readonly expectedRevision: Version;
  readonly audit: CharacterAudit;
  readonly now: Temporal.Instant;
}

/**
 * Port for character persistence. Adapters live in
 * `character-infrastructure`; `InMemoryCharacterRepository` is for tests. Every write takes the
 * actor and command that made it, for the audit log.
 */
export abstract class CharacterRepository {
  /**
   * One owner's characters, sorted by an enumerated, indexed option; `id` breaks ties so pages
   * are stable.
   */
  public abstract listForOwner(ownerId: UserId, query: CharacterListQuery): Promise<readonly Character[]>;

  /** Any owner's; the service applies the access policy. */
  public abstract findById(id: CharacterId): Promise<Character | undefined>;

  /** Insert a new character at version 1, with its play state fresh at revision 1. */
  public abstract insert(character: Character, audit: CharacterAudit): Promise<Character>;

  /**
   * Persist `character` only if the stored version is still `expectedVersion`;
   * returns it at `expectedVersion + 1`. Throws `VersionConflictError` otherwise.
   */
  public abstract update(character: Character, expectedVersion: Version, audit: CharacterAudit): Promise<Character>;

  /** A character's play state and its revision; undefined for a missing character. */
  public abstract findPlay(id: CharacterId): Promise<CharacterPlay | undefined>;

  /**
   * Persist `play` only if the stored play revision is still `expectedRevision`; returns it at `expectedRevision + 1`.
   * Never touches the character's `version`. Throws `VersionConflictError` otherwise.
   */
  public abstract updatePlay(write: PlayWrite): Promise<CharacterPlay>;
}
