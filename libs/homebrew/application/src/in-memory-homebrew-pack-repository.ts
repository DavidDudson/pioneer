import type { HomebrewPack } from '@pioneer/homebrew/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

import { HomebrewPackRepository } from './homebrew-pack-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryHomebrewPackRepository extends HomebrewPackRepository {
  readonly #rows = new Map<ContentPackId, HomebrewPack>();

  public override async listOwnedBy(ownerId: UserId): Promise<readonly HomebrewPack[]> {
    return [...this.#rows.values()]
      .filter((pack) => pack.ownerId === ownerId)
      .toSorted(
        (left, right) =>
          right.updatedAt.epochMilliseconds - left.updatedAt.epochMilliseconds || left.id.localeCompare(right.id),
      );
  }

  public override async findById(id: ContentPackId): Promise<HomebrewPack | undefined> {
    return this.#rows.get(id);
  }

  public override async insert(pack: HomebrewPack): Promise<HomebrewPack | undefined> {
    const taken = [...this.#rows.values()].some((row) => row.slug === pack.slug);
    if (taken) {
      return undefined;
    }
    this.#rows.set(pack.id, pack);
    return pack;
  }

  public override async updateVisibility(
    pack: HomebrewPack,
    whileLocked?: () => Promise<void>,
  ): Promise<HomebrewPack | undefined> {
    if (this.#rows.get(pack.id)?.ownerId !== pack.ownerId) {
      return undefined;
    }
    await whileLocked?.();
    this.#rows.set(pack.id, pack);
    return pack;
  }
}
