import type { MemberName } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Port to identity for the names members go by. Identity owns accounts, so the adapter lives in
 * the composition root; `InMemoryMemberDirectory` is for tests.
 */
export abstract class MemberDirectory {
  /** The display name of each user that has an account; unknown ids are left out. */
  public abstract displayNames(userIds: readonly UserId[]): Promise<ReadonlyMap<UserId, MemberName>>;
}
