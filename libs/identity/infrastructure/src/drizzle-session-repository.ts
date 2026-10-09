import { SessionRepository } from '@pioneer/identity/application';
import type { Session, TokenHash, User } from '@pioneer/identity/domain';
import type { Temporal } from '@pioneer/shared/kernel';
import { and, eq, gt } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { toUser } from './drizzle-user-repository';
import { sessions, users } from './identity.table';

export class DrizzleSessionRepository extends SessionRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async insert(session: Session): Promise<void> {
    await this.#db.insert(sessions).values({
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      createdAt: session.createdAt.toString(),
      expiresAt: session.expiresAt.toString(),
    });
  }

  public override async findUser(tokenHash: TokenHash, now: Temporal.Instant): Promise<User | undefined> {
    const unexpired = gt(sessions.expiresAt, now.toString());
    const [row] = await this.#db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, tokenHash), unexpired))
      .limit(1);
    return row === undefined ? undefined : toUser(row.user);
  }

  public override async delete(tokenHash: TokenHash): Promise<void> {
    await this.#db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
}
