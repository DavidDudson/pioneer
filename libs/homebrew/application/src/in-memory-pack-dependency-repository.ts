import type { ContentPackId, PackDependencyEdge } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

import { PackDependencyRepository } from './pack-dependency-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryPackDependencyRepository extends PackDependencyRepository {
  readonly #edges: PackDependencyEdge[] = [];

  public override async edges(): Promise<readonly PackDependencyEdge[]> {
    return [...this.#edges];
  }

  public override async add(_actor: UserId, edge: PackDependencyEdge, whileLocked: () => Promise<void>): Promise<void> {
    await whileLocked();
    const stored = this.#edges.some(({ pack, dependsOn }) => pack === edge.pack && dependsOn === edge.dependsOn);
    if (!stored) {
      this.#edges.push(edge);
    }
  }

  public override async remove(_actor: UserId, edge: PackDependencyEdge): Promise<void> {
    const at = this.#edges.findIndex(({ pack, dependsOn }) => pack === edge.pack && dependsOn === edge.dependsOn);
    if (at !== -1) {
      this.#edges.splice(at, 1);
    }
  }

  public override async dependentsOf(pack: ContentPackId): Promise<readonly ContentPackId[]> {
    return this.#edges.filter((edge) => edge.dependsOn === pack).map((edge) => edge.pack);
  }
}
