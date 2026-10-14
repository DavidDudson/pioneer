import type { EnabledPackId, PackPublisher, PackTitle } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

/** A pack, official or homebrew, as the campaign context needs to know it. */
export interface CatalogPack {
  readonly id: EnabledPackId;
  readonly title: PackTitle;
  readonly publisher: PackPublisher;
  /** Official packs are always on in every campaign. */
  readonly official: boolean;
  /** Only its owner may read it, so a campaign cannot use it yet. */
  readonly private: boolean;
}

/**
 * Port to the content packs for campaigns. Homebrew owns who may read a pack and which packs extend which, and the
 * campaign context may not import it, so the adapter lives in the composition root (ADR-0055).
 * `InMemoryPackCatalog` is for tests.
 */
export abstract class PackCatalog {
  /** Every official pack, by title: the ones every campaign has on. */
  public abstract official(): Promise<readonly CatalogPack[]>;

  /** Every pack the user may read, official ones included, by title then id. */
  public abstract readableBy(viewer: UserId): Promise<readonly CatalogPack[]>;

  /** These packs, whoever may read them; one that does not exist is left out. */
  public abstract byIds(ids: readonly EnabledPackId[]): Promise<ReadonlyMap<EnabledPackId, CatalogPack>>;

  /**
   * The pack and every pack it extends, transitively, the pack last and each after the packs it extends. An unknown
   * pack is only itself.
   */
  public abstract closure(id: EnabledPackId): Promise<readonly EnabledPackId[]>;
}
