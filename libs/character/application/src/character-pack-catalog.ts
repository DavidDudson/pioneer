import type { PackPublisher, PackTitle } from '@pioneer/character/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

/** A pack, official or homebrew, as the character context needs to know it. */
export interface CatalogPack {
  readonly id: ContentPackId;
  readonly title: PackTitle;
  readonly publisher: PackPublisher;
  /** Official packs are always on for every character. */
  readonly official: boolean;
  /** Only its owner may read it. */
  readonly private: boolean;
}

/**
 * Port to the content packs for characters. Homebrew owns who may read a pack and which packs extend which, and the
 * character context may not import it, so the adapter lives in the composition root (ADR-0055).
 * `InMemoryCharacterPackCatalog` is for tests.
 */
export abstract class CharacterPackCatalog {
  /** Every official pack, by title: the ones every character has on. */
  public abstract official(): Promise<readonly CatalogPack[]>;

  /** Every pack the user may read, official ones included, by title then id. */
  public abstract readableBy(viewer: UserId): Promise<readonly CatalogPack[]>;

  /** These packs, whoever may read them; one that does not exist is left out. */
  public abstract byIds(ids: readonly ContentPackId[]): Promise<ReadonlyMap<ContentPackId, CatalogPack>>;

  /**
   * The pack and every pack it extends, transitively, the pack last and each after the packs it extends. An unknown
   * pack is only itself.
   */
  public abstract closure(id: ContentPackId): Promise<readonly ContentPackId[]>;
}
