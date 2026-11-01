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
   * One owner's live characters, sorted by an enumerated, indexed option; `id` breaks ties so pages
   * are stable.
   */
  public abstract listForOwner(ownerId: UserId, query: CharacterListQuery): Promise<readonly Character[]>;

  /** One owner's archived characters (ADR-0062), in the same orders as `listForOwner`. */
  public abstract listArchivedForOwner(ownerId: UserId, query: CharacterListQuery): Promise<readonly Character[]>;

  /** Any owner's live character; an archived one reads as missing. The service applies the access policy. */
  public abstract findById(id: CharacterId): Promise<Character | undefined>;

  /** Any owner's live characters among `ids`, in one read; archived and unknown ids are left out. */
  public abstract findByIds(ids: readonly CharacterId[]): Promise<readonly Character[]>;

  /** Any owner's archived character; a live one reads as missing here. */
  public abstract findArchivedById(id: CharacterId): Promise<Character | undefined>;

  /** Marks a live character archived at `now`, leaving its version and everything it holds alone. A no-op if it already is. */
  public abstract archive(id: CharacterId, now: Temporal.Instant, audit: CharacterAudit): Promise<void>;

  /** Clears the archived mark. A no-op if the character is live. */
  public abstract restore(id: CharacterId, audit: CharacterAudit): Promise<void>;

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

  /**
   * `updatePlay` and `update` as one write, for a play edit that also changes the build (a wand broken or destroyed by
   * an overcharge): both revisions are checked and both rows are written, or neither is, under one audit stamp.
   * Returns the play state at its next revision; throws `VersionConflictError` if either revision moved.
   */
  public abstract updatePlayAndCharacter(
    write: PlayWrite,
    character: Character,
    expectedVersion: Version,
  ): Promise<CharacterPlay>;
}
