import type { HomebrewCommand } from '@pioneer/homebrew/domain';
import type { ContentEntry, ContentId, ContentPackId } from '@pioneer/rules/sdk';
import type { Temporal, UserId } from '@pioneer/shared/kernel';

/** An entry as stored: the whole `ContentEntry`, when it was last written, and when it was archived, if it was. */
export interface StoredHomebrewEntry {
  readonly entry: ContentEntry;
  readonly updatedAt: Temporal.Instant;
  readonly archivedAt?: Temporal.Instant;
}

/** One entry of one pack. */
export interface EntryRef {
  readonly pack: ContentPackId;
  readonly id: ContentId;
}

/** What a write is stamped with in the audit log, and when it happened. */
export interface EntryWrite {
  readonly actor: UserId;
  readonly command: HomebrewCommand;
  readonly now: Temporal.Instant;
}

/**
 * Port for the entries of homebrew packs. Every write moves its pack on (version, hash and time) in the same
 * transaction, so a pack's `content_hash` always names what it holds. Adapters live in `homebrew-infrastructure`;
 * `InMemoryHomebrewEntryRepository` is for tests.
 */
export abstract class HomebrewEntryRepository {
  /** The pack's live entries, or its archived ones, by kind then slug. */
  public abstract list(pack: ContentPackId, archived: boolean): Promise<ReadonlyArray<StoredHomebrewEntry>>;

  /** One entry of the pack, live or archived. */
  public abstract find(ref: EntryRef): Promise<StoredHomebrewEntry | undefined>;

  /**
   * Stores a new entry. False when the pack already holds that slug, live or archived (an archived entry keeps its
   * slug until restored, ADR-0062), so two creations racing for it cannot both succeed.
   */
  public abstract insert(pack: ContentPackId, entry: ContentEntry, write: EntryWrite): Promise<boolean>;

  /** Rewrites a live entry; false when it is not there or is archived. */
  public abstract replace(pack: ContentPackId, entry: ContentEntry, write: EntryWrite): Promise<boolean>;

  /** Archives or restores the entry; a no-op when it already is. False when the pack holds no such entry. */
  public abstract setArchived(ref: EntryRef, archived: boolean, write: EntryWrite): Promise<boolean>;
}
