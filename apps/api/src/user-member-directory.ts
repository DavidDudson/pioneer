import { MemberDirectory } from '@pioneer/campaign/application';
import { MemberName } from '@pioneer/campaign/domain';
import { users } from '@pioneer/identity/infrastructure';
import type { UserId } from '@pioneer/shared/kernel';
import { inArray } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

/**
 * Campaign's `MemberDirectory` over identity's users. It lives in the composition root because
 * neither context may import the other.
 */
export class UserMemberDirectory extends MemberDirectory {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async displayNames(userIds: readonly UserId[]): Promise<ReadonlyMap<UserId, MemberName>> {
    if (userIds.length === 0) {
      return new Map();
    }
    const rows = await this.#db
      .select({ id: users.id, displayName: users.displayName })
      .from(users)
      .where(inArray(users.id, [...userIds]));
    return new Map(rows.map((row) => [row.id, MemberName.parse(row.displayName)]));
  }
}
