import type { Session, SessionId, TokenHash, User, UserId } from '@pioneer/identity/domain';
import type { Temporal } from '@pioneer/shared/kernel';

/** An unexpired session and the user it signs in. */
export interface ActiveSession {
  readonly session: Session;
  readonly user: User;
}

/** Port for sessions. Tokens never reach it, only their hashes. */
export abstract class SessionRepository {
  public abstract insert(session: Session): Promise<void>;

  /** The unexpired session behind a token hash and its user, in one lookup. */
  public abstract findActive(tokenHash: TokenHash, now: Temporal.Instant): Promise<ActiveSession | undefined>;

  /** Saves a used session's `lastSeenAt` and `expiresAt`. */
  public abstract touch(session: Session): Promise<void>;

  /** The user's unexpired sessions, most recently seen first. */
  public abstract listForUser(userId: UserId, now: Temporal.Instant): Promise<Session[]>;

  /** Removes the session if it exists. */
  public abstract delete(tokenHash: TokenHash): Promise<void>;

  /** Removes one of the user's sessions; false when the user has no session with that id. */
  public abstract deleteForUser(userId: UserId, id: SessionId): Promise<boolean>;

  /** Removes every session the user has. */
  public abstract deleteAllForUser(userId: UserId): Promise<void>;

  /** Removes sessions that expired at or before `now`, returning how many. */
  public abstract deleteExpired(now: Temporal.Instant): Promise<number>;
}
