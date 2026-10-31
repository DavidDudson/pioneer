import { OverrideAuthorName } from '@pioneer/character/domain';
import type { UserId } from '@pioneer/shared/kernel';

import { OverrideAuthorDirectory } from './override-author-directory';

/** Directory adapter for tests, and for a service built with none: names given up front. */
export class InMemoryOverrideAuthorDirectory extends OverrideAuthorDirectory {
  readonly #names = new Map<UserId, OverrideAuthorName>();

  public name(userId: UserId, name: string): this {
    this.#names.set(userId, OverrideAuthorName.parse(name));
    return this;
  }

  public override async displayNames(userIds: readonly UserId[]): Promise<ReadonlyMap<UserId, OverrideAuthorName>> {
    return new Map(
      userIds.flatMap((userId): [UserId, OverrideAuthorName][] => {
        const name = this.#names.get(userId);
        return name === undefined ? [] : [[userId, name]];
      }),
    );
  }
}
