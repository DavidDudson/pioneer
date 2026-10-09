import type { Session, SessionId, TokenHash, UserId } from '@pioneer/identity/domain';
import { Temporal } from '@pioneer/shared/kernel';

import type { InMemoryUserRepository } from './in-memory-user-repository';
import { SessionRepository } from './session-repository';
import type { ActiveSession } from './session-repository';

/** Session adapter for tests; resolves users through the paired user repository. */
export class InMemorySessionRepository extends SessionRepository {
  readonly #sessions = new Map<TokenHash, Session>();
  readonly #users: InMemoryUserRepository;

  public constructor(users: InMemoryUserRepository) {
    super();
    this.#users = users;
  }

  public override async insert(session: Session): Promise<void> {
    this.#sessions.set(session.tokenHash, session);
  }

  public override async findActive(tokenHash: TokenHash, now: Temporal.Instant): Promise<ActiveSession | undefined> {
    const session = this.#sessions.get(tokenHash);
    if (session === undefined || session.isExpiredAt(now)) {
      return undefined;
    }
    const user = this.#users.get(session.userId);
    return user === undefined ? undefined : { session, user };
  }

  public override async touch(session: Session): Promise<void> {
    if (this.#sessions.has(session.tokenHash)) {
      this.#sessions.set(session.tokenHash, session);
    }
  }

  public override async listForUser(userId: UserId, now: Temporal.Instant): Promise<Session[]> {
    return [...this.#sessions.values()]
      .filter((session) => session.userId === userId && !session.isExpiredAt(now))
      .toSorted((left, right) => Temporal.Instant.compare(right.lastSeenAt, left.lastSeenAt));
  }

  public override async delete(tokenHash: TokenHash): Promise<void> {
    this.#sessions.delete(tokenHash);
  }

  public override async deleteForUser(userId: UserId, id: SessionId): Promise<boolean> {
    const match = [...this.#sessions.values()].find((session) => session.id === id && session.userId === userId);
    if (match === undefined) {
      return false;
    }
    this.#sessions.delete(match.tokenHash);
    return true;
  }

  public override async deleteAllForUser(userId: UserId): Promise<void> {
    for (const session of this.#sessions.values()) {
      if (session.userId === userId) {
        this.#sessions.delete(session.tokenHash);
      }
    }
  }

  public override async deleteExpired(now: Temporal.Instant): Promise<number> {
    const expired = [...this.#sessions.values()].filter((session) => session.isExpiredAt(now));
    for (const session of expired) {
      this.#sessions.delete(session.tokenHash);
    }
    return expired.length;
  }

  public get size(): number {
    return this.#sessions.size;
  }

  /** The stored session for a token hash, for asserting on writes. */
  public get(tokenHash: TokenHash): Session | undefined {
    return this.#sessions.get(tokenHash);
  }
}
