import type { ContentText } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Port to identity for the name an author goes by. Identity owns accounts, so the adapter lives in the
 * composition root; `InMemoryAuthorDirectory` is for tests.
 */
export abstract class AuthorDirectory {
  /** The display name of the user, or undefined when they have no account. */
  public abstract displayName(userId: UserId): Promise<ContentText | undefined>;
}
