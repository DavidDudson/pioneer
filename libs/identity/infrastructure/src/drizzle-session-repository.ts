import { SessionRepository } from '@pioneer/identity/application';
import type { ActiveSession } from '@pioneer/identity/application';
import { Session } from '@pioneer/identity/domain';
import type { SessionId, TokenHash, UserId } from '@pioneer/identity/domain';
import { Temporal } from '@pioneer/shared/kernel';
import { and, desc, eq, gt, lte } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { toUser } from './drizzle-user-repository';
import { sessions, users } from './identity.table';

type SessionRow = typeof sessions.$inferSelect;

function toSession(row: SessionRow): Session {
  return new Session({
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    createdAt: Temporal.Instant.from(row.createdAt),
    lastSeenAt: Temporal.Instant.from(row.lastSeenAt),
    expiresAt: Temporal.Instant.from(row.expiresAt),
  });
}

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
      lastSeenAt: session.lastSeenAt.toString(),
      expiresAt: session.expiresAt.toString(),
    });
  }

  public override async findActive(tokenHash: TokenHash, now: Temporal.Instant): Promise<ActiveSession | undefined> {
    const unexpired = gt(sessions.expiresAt, now.toString());
    const [row] = await this.#db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, tokenHash), unexpired))
      .limit(1);
    return row === undefined ? undefined : { session: toSession(row.session), user: toUser(row.user) };
  }

  public override async touch(session: Session): Promise<void> {
    await this.#db
      .update(sessions)
      .set({ lastSeenAt: session.lastSeenAt.toString(), expiresAt: session.expiresAt.toString() })
      .where(eq(sessions.id, session.id));
  }

  public override async listForUser(userId: UserId, now: Temporal.Instant): Promise<Session[]> {
    const unexpired = gt(sessions.expiresAt, now.toString());
    const rows = await this.#db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), unexpired))
      .orderBy(desc(sessions.lastSeenAt), desc(sessions.id));
    return rows.map((row) => toSession(row));
  }

  public override async delete(tokenHash: TokenHash): Promise<void> {
    await this.#db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  public override async deleteForUser(userId: UserId, id: SessionId): Promise<boolean> {
    const deleted = await this.#db
      .delete(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
      .returning({ id: sessions.id });
    return deleted.length > 0;
  }

  public override async deleteAllForUser(userId: UserId): Promise<void> {
    await this.#db.delete(sessions).where(eq(sessions.userId, userId));
  }

  public override async deleteExpired(now: Temporal.Instant): Promise<number> {
    const deleted = await this.#db
      .delete(sessions)
      .where(lte(sessions.expiresAt, now.toString()))
      .returning({ id: sessions.id });
    return deleted.length;
  }
}
