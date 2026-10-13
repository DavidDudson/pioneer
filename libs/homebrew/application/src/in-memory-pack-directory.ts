import { PackVisibility } from '@pioneer/rules/sdk';
import type { ContentPackId, ContentText, PackId } from '@pioneer/rules/sdk';

import type { InMemoryHomebrewPackRepository } from './in-memory-homebrew-pack-repository';
import { listedHomebrew, PackDirectory } from './pack-directory';
import type { ListedPack } from './pack-directory';

/** An official pack to make known: public, with no owner. */
export interface OfficialPack {
  readonly slug: PackId;
  readonly id: ContentPackId;
  readonly title: ContentText;
  readonly publisher: ContentText;
}

/** Directory adapter for tests: the homebrew packs in a repository, and official packs given up front. */
export class InMemoryPackDirectory extends PackDirectory {
  readonly #homebrew: InMemoryHomebrewPackRepository;
  readonly #official = new Map<ContentPackId, ListedPack>();

  public constructor(homebrew: InMemoryHomebrewPackRepository) {
    super();
    this.#homebrew = homebrew;
  }

  public official({ id, slug, title, publisher }: OfficialPack): this {
    this.#official.set(id, {
      id,
      ownerId: undefined,
      visibility: PackVisibility.Public,
      summary: { id, slug, title, publisher, visibility: PackVisibility.Public, official: true },
    });
    return this;
  }

  public override async findById(id: ContentPackId): Promise<ListedPack | undefined> {
    const pack = await this.#homebrew.findById(id);
    return pack === undefined ? this.#official.get(id) : listedHomebrew(pack);
  }

  public override async all(): Promise<readonly ListedPack[]> {
    const packs = await this.#homebrew.all();
    return [...this.#official.values(), ...packs.map((pack) => listedHomebrew(pack))].toSorted(
      (left, right) => left.summary.title.localeCompare(right.summary.title) || left.id.localeCompare(right.id),
    );
  }
}
