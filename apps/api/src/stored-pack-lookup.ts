import { PackLookup } from '@pioneer/character/application';
import type { StoredContentSource } from '@pioneer/rules/infrastructure';
import type { ContentId, ContentPackId } from '@pioneer/rules/sdk';

/** The character context's `PackLookup` over the content tables. It lives in the composition root because the contexts may not import each other. */
export class StoredPackLookup extends PackLookup {
  readonly #content: StoredContentSource;

  public constructor(content: StoredContentSource) {
    super();
    this.#content = content;
  }

  public override async packsOf(entryIds: readonly ContentId[]): Promise<readonly ContentPackId[]> {
    return this.#content.packsOfEntries(entryIds);
  }
}
