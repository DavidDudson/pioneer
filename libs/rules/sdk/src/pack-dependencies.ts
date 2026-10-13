import type { ContentPackId } from './content-id';

/** One pack extending another: `pack` may reference anything in `dependsOn`. */
export interface PackDependencyEdge {
  readonly pack: ContentPackId;
  readonly dependsOn: ContentPackId;
}

/** The packs `pack` extends directly, ordered by id so a walk is the same wherever it runs. */
function directDependencies(edges: readonly PackDependencyEdge[], pack: ContentPackId): readonly ContentPackId[] {
  return edges
    .filter((edge) => edge.pack === pack)
    .map((edge) => edge.dependsOn)
    .toSorted((left, right) => left.localeCompare(right));
}

/** Whether `from` is `to` or extends it, through any number of packs. */
export function reaches(edges: readonly PackDependencyEdge[], from: ContentPackId, to: ContentPackId): boolean {
  const seen = new Set<ContentPackId>();
  const pending = [from];
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    if (next === to) {
      return true;
    }
    if (!seen.has(next)) {
      seen.add(next);
      pending.push(...directDependencies(edges, next));
    }
  }
  return false;
}

/** Whether adding `edge` to an acyclic graph would close a cycle; a pack depending on itself is one. */
export function wouldCycle(edges: readonly PackDependencyEdge[], edge: PackDependencyEdge): boolean {
  return reaches(edges, edge.dependsOn, edge.pack);
}

/**
 * Every pack `root` needs, `root` last, each after the packs it extends: the order a registry registers them in, so
 * a pack's references already resolve when it is. Packs that need nothing from each other come in id order. The
 * graph is acyclic (`wouldCycle` keeps it so); a cycle in stored data is cut where the walk meets it instead of
 * looping.
 */
export function loadOrder(edges: readonly PackDependencyEdge[], root: ContentPackId): readonly ContentPackId[] {
  const ordered: ContentPackId[] = [];
  const visited = new Set<ContentPackId>();
  const visit = (pack: ContentPackId): void => {
    if (visited.has(pack)) {
      return;
    }
    visited.add(pack);
    for (const dependency of directDependencies(edges, pack)) {
      visit(dependency);
    }
    ordered.push(pack);
  };
  visit(root);
  return ordered;
}
