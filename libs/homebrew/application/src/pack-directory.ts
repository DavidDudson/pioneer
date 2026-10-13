import type { HomebrewPack, PackSummary } from '@pioneer/homebrew/domain';
import type { ContentPackId, PackVisibility } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

/** What the access policy needs of any pack, official or homebrew. */
export interface ReadablePack {
  readonly id: ContentPackId;
  /** Absent for official packs. */
  readonly ownerId: UserId | undefined;
  readonly visibility: PackVisibility;
}

/** A pack of either kind, with its owner so the policy can be applied to it. */
export interface ListedPack extends ReadablePack {
  readonly summary: PackSummary;
}

/**
 * Port to the content tables for every pack, official ones too: a homebrew pack can extend either. The adapter lives
 * in `homebrew-infrastructure`; `InMemoryPackDirectory` is for tests.
 */
export abstract class PackDirectory {
  /** Any pack, official or homebrew; the service applies the access policy. */
  public abstract findById(id: ContentPackId): Promise<ListedPack | undefined>;

  /** Every pack, by title then id; the service keeps the ones the actor may read. */
  public abstract all(): Promise<readonly ListedPack[]>;
}

/** A homebrew pack as the directory lists it. */
export function listedHomebrew(pack: HomebrewPack): ListedPack {
  return {
    id: pack.id,
    ownerId: pack.ownerId,
    visibility: pack.visibility,
    summary: {
      id: pack.id,
      slug: pack.slug,
      title: pack.title,
      publisher: pack.publisher,
      visibility: pack.visibility,
      official: false,
    },
  };
}
