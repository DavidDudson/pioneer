import { AuthorDirectory } from '@pioneer/homebrew/application';
import { users } from '@pioneer/identity/infrastructure';
import { ContentText } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';
import { eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

/**
 * Homebrew's `AuthorDirectory` over identity's users. It lives in the composition root because neither context
 * may import the other.
 */
export class UserAuthorDirectory extends AuthorDirectory {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async displayName(userId: UserId): Promise<ContentText | undefined> {
    const [row] = await this.#db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return row === undefined ? undefined : ContentText.parse(row.displayName);
  }
}
