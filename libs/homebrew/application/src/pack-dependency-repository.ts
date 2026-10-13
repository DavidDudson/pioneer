import type { ContentPackId, PackDependencyEdge } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Port for which packs extend which. Adapters live in `homebrew-infrastructure`; `InMemoryPackDependencyRepository`
 * is for tests.
 */
export abstract class PackDependencyRepository {
  /** Every dependency of every pack. The graph is small, and cycles are found over all of it. */
  public abstract edges(): Promise<readonly PackDependencyEdge[]>;

  /**
   * Store the dependency unless the pair is stored already. `whileLocked` runs first, with the dependency graph held
   * against other additions and both packs held against a visibility change; if it throws, nothing is stored. That
   * makes the cycle and visibility checks it holds race-free.
   */
  public abstract add(actor: UserId, edge: PackDependencyEdge, whileLocked: () => Promise<void>): Promise<void>;

  /** Remove the dependency; nothing happens when it is not there. */
  public abstract remove(actor: UserId, edge: PackDependencyEdge): Promise<void>;

  /** The packs that extend `pack` directly. */
  public abstract dependentsOf(pack: ContentPackId): Promise<readonly ContentPackId[]>;
}
