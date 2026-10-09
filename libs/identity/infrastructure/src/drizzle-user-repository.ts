import { UserRepository } from '@pioneer/identity/application';
import { OAuthAccountId, User } from '@pioneer/identity/domain';
import type { OAuthProvider, ProviderSubject } from '@pioneer/identity/domain';
import { newId, Temporal } from '@pioneer/shared/kernel';
import { and, eq, sql } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { PgInsertValue, PgUpdateSetSource } from 'drizzle-orm/pg-core';

import { oauthAccounts, users } from './identity.table';

type UserRow = typeof users.$inferSelect;
/** Valid both as an insert row and as an update's SET list. */
type UserValues = PgInsertValue<typeof users> & PgUpdateSetSource<typeof users>;

/** SQL NULL for a cleared optional field; on update, `undefined` would leave the old value. */
const SQL_NULL = sql`null`;

export function toUser(row: UserRow): User {
  return new User({
    id: row.id,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl ?? undefined,
    email: row.email ?? undefined,
    emailVerified: row.emailVerified,
    createdAt: Temporal.Instant.from(row.createdAt),
    updatedAt: Temporal.Instant.from(row.updatedAt),
  });
}

function toValues(user: User): UserValues {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? SQL_NULL,
    email: user.email ?? SQL_NULL,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toString(),
    updatedAt: user.updatedAt.toString(),
  };
}

export class DrizzleUserRepository extends UserRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async findByProviderAccount(
    provider: OAuthProvider,
    subject: ProviderSubject,
  ): Promise<User | undefined> {
    const [row] = await this.#db
      .select({ user: users })
      .from(oauthAccounts)
      .innerJoin(users, eq(users.id, oauthAccounts.userId))
      .where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.subject, subject)))
      .limit(1);
    return row === undefined ? undefined : toUser(row.user);
  }

  public override async insertWithAccount(
    user: User,
    provider: OAuthProvider,
    subject: ProviderSubject,
  ): Promise<User> {
    return this.#db.transaction(async (tx) => {
      const [row] = await tx.insert(users).values(toValues(user)).returning();
      if (row === undefined) {
        throw new Error(`Insert of user ${user.id} returned no row`);
      }
      const accountId = OAuthAccountId.parse(newId());
      await tx
        .insert(oauthAccounts)
        .values({ id: accountId, userId: user.id, provider, subject, createdAt: user.createdAt.toString() });
      return toUser(row);
    });
  }

  public override async update(user: User): Promise<User> {
    const [row] = await this.#db.update(users).set(toValues(user)).where(eq(users.id, user.id)).returning();
    if (row === undefined) {
      throw new Error(`Update of user ${user.id} matched no row`);
    }
    return toUser(row);
  }
}
