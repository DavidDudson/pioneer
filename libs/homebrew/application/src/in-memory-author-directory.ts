import { ContentText } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

import { AuthorDirectory } from './author-directory';

/** Directory adapter for tests: names given up front. */
export class InMemoryAuthorDirectory extends AuthorDirectory {
  readonly #names = new Map<UserId, ContentText>();

  public name(userId: UserId, name: string): this {
    this.#names.set(userId, ContentText.parse(name));
    return this;
  }

  public override async displayName(userId: UserId): Promise<ContentText | undefined> {
    return this.#names.get(userId);
  }
}
