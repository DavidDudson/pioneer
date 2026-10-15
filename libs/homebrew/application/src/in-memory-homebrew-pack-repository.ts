import type { HomebrewPack } from '@pioneer/homebrew/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';
import type { Temporal, UserId } from '@pioneer/shared/kernel';

import { HomebrewPackRepository } from './homebrew-pack-repository';
import type { GuardedChange, HomebrewAudit } from './homebrew-pack-repository';

/** Newest first, pack id breaking ties. */
function newestFirst(left: HomebrewPack, right: HomebrewPack): number {
  return right.updatedAt.epochMilliseconds - left.updatedAt.epochMilliseconds || left.id.localeCompare(right.id);
}

/** Repository adapter for tests and local experiments. */
export class InMemoryHomebrewPackRepository extends HomebrewPackRepository {
  readonly #rows = new Map<ContentPackId, HomebrewPack>();
  readonly #archived = new Set<ContentPackId>();
  readonly #audits: HomebrewAudit[] = [];

  /** What archive and restore were stamped with, in order. */
  public get audits(): readonly HomebrewAudit[] {
    return this.#audits;
  }

  public override async listOwnedBy(ownerId: UserId): Promise<readonly HomebrewPack[]> {
    return [...this.#rows.values()]
      .filter((pack) => pack.ownerId === ownerId && !this.#archived.has(pack.id))
      .toSorted(newestFirst);
  }

  public override async listArchivedOwnedBy(ownerId: UserId): Promise<readonly HomebrewPack[]> {
    return [...this.#rows.values()]
      .filter((pack) => pack.ownerId === ownerId && this.#archived.has(pack.id))
      .toSorted(newestFirst);
  }

  /** Every live pack, whoever owns it. */
  public async all(): Promise<readonly HomebrewPack[]> {
    return [...this.#rows.values()].filter((pack) => !this.#archived.has(pack.id));
  }

  public override async findById(id: ContentPackId): Promise<HomebrewPack | undefined> {
    return this.#archived.has(id) ? undefined : this.#rows.get(id);
  }

  public override async findArchivedById(id: ContentPackId): Promise<HomebrewPack | undefined> {
    return this.#archived.has(id) ? this.#rows.get(id) : undefined;
  }

  public override async archive(
    id: ContentPackId,
    _now: Temporal.Instant,
    { audit, whileLocked }: GuardedChange,
  ): Promise<void> {
    if (!this.#rows.has(id) || this.#archived.has(id)) {
      return;
    }
    await whileLocked?.();
    this.#audits.push(audit);
    this.#archived.add(id);
  }

  public override async restore(id: ContentPackId, { audit, whileLocked }: GuardedChange): Promise<void> {
    if (!this.#archived.has(id)) {
      return;
    }
    await whileLocked?.();
    this.#audits.push(audit);
    this.#archived.delete(id);
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
    if (this.#rows.get(pack.id)?.ownerId !== pack.ownerId || this.#archived.has(pack.id)) {
      return undefined;
    }
    await whileLocked?.();
    this.#rows.set(pack.id, pack);
    return pack;
  }
}
