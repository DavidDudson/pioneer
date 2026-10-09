import type { Session, TokenHash, User } from '@pioneer/identity/domain';
import type { Temporal } from '@pioneer/shared/kernel';

import type { InMemoryUserRepository } from './in-memory-user-repository';
import { SessionRepository } from './session-repository';

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

  public override async findUser(tokenHash: TokenHash, now: Temporal.Instant): Promise<User | undefined> {
    const session = this.#sessions.get(tokenHash);
    if (session === undefined || session.isExpiredAt(now)) {
      return undefined;
    }
    return this.#users.get(session.userId);
  }

  public override async delete(tokenHash: TokenHash): Promise<void> {
    this.#sessions.delete(tokenHash);
  }

  public get size(): number {
    return this.#sessions.size;
  }
}
