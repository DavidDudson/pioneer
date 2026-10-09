import type { Session, TokenHash, User } from '@pioneer/identity/domain';
import type { Temporal } from '@pioneer/shared/kernel';

/** Port for sessions. Tokens never reach it, only their hashes. */
export abstract class SessionRepository {
  public abstract insert(session: Session): Promise<void>;

  /** The user behind an unexpired session, in one lookup. */
  public abstract findUser(tokenHash: TokenHash, now: Temporal.Instant): Promise<User | undefined>;

  /** Removes the session if it exists. */
  public abstract delete(tokenHash: TokenHash): Promise<void>;
}
