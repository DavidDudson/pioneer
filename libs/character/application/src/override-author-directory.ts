import type { OverrideAuthorName } from '@pioneer/character/domain';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Port to identity for the names override authors go by. Identity owns accounts, so the adapter lives in the
 * composition root; `InMemoryOverrideAuthorDirectory` is for tests.
 */
export abstract class OverrideAuthorDirectory {
  /** The display name of each user that has an account; unknown ids are left out. */
  public abstract displayNames(userIds: readonly UserId[]): Promise<ReadonlyMap<UserId, OverrideAuthorName>>;
}
