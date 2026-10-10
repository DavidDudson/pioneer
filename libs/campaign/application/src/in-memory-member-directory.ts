import { MemberName } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

import { MemberDirectory } from './member-directory';

/** Directory adapter for tests: names given up front. */
export class InMemoryMemberDirectory extends MemberDirectory {
  readonly #names = new Map<UserId, MemberName>();

  public name(userId: UserId, name: string): this {
    this.#names.set(userId, MemberName.parse(name));
    return this;
  }

  public override async displayNames(userIds: readonly UserId[]): Promise<ReadonlyMap<UserId, MemberName>> {
    return new Map(
      userIds.flatMap((userId): [UserId, MemberName][] => {
        const name = this.#names.get(userId);
        return name === undefined ? [] : [[userId, name]];
      }),
    );
  }
}
