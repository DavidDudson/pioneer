import type { PackAccessPolicy, PackDirectory } from '@pioneer/homebrew/application';
import { SearchableHomebrew } from '@pioneer/rules/infrastructure';
import type { ContentPackId } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * The content context's `SearchableHomebrew` over homebrew's ports: a pack is searched by whoever `PackAccessPolicy`
 * lets read it, and an anonymous caller searches none. A pack that is official, unreadable or missing is left out, so
 * the answer says nothing about it (ADR-0007).
 */
export class SearchableHomebrewPacks extends SearchableHomebrew {
  readonly #directory: PackDirectory;
  readonly #access: PackAccessPolicy;

  public constructor(directory: PackDirectory, access: PackAccessPolicy) {
    super();
    this.#directory = directory;
    this.#access = access;
  }

  public override async readable(
    actor: UserId | undefined,
    packs: readonly ContentPackId[],
  ): Promise<readonly ContentPackId[]> {
    if (actor === undefined) {
      return [];
    }
    const listed = await Promise.all(packs.map(async (id) => this.#directory.findById(id)));
    const checked = await Promise.all(
      listed.map(async (pack): Promise<ContentPackId | undefined> => {
        if (pack?.ownerId === undefined) {
          return undefined;
        }
        const mayRead = await this.#access.mayRead(actor, pack);
        return mayRead ? pack.id : undefined;
      }),
    );
    return checked.filter((id) => id !== undefined);
  }
}
