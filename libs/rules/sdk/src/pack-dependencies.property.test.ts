import { describe, expect, test } from 'bun:test';

import { assert, array, integer, property, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { contentPackId, PackId } from './content-id';
import type { ContentPackId } from './content-id';
import { loadOrder, reaches, wouldCycle } from './pack-dependencies';
import type { PackDependencyEdge } from './pack-dependencies';

const PACKS = 8;
const MAX_EDGES = 20;

const packs: readonly ContentPackId[] = Array.from({ length: PACKS }, (_pack, index) =>
  contentPackId(PackId.parse(`pack-${index}`)),
);

/** Acyclic by construction: a pack only ever extends one with a lower index. */
const acyclicEdges: Arbitrary<readonly PackDependencyEdge[]> = array(
  tuple(integer({ min: 1, max: PACKS - 1 }), integer({ min: 0, max: PACKS - 2 })),
  { maxLength: MAX_EDGES },
).map((pairs) =>
  pairs.flatMap(([from, to]): PackDependencyEdge[] => {
    const pack = packs[from];
    const dependsOn = packs[to];
    return pack === undefined || dependsOn === undefined || to >= from ? [] : [{ pack, dependsOn }];
  }),
);

const anyPack: Arbitrary<ContentPackId> = integer({
  min: 0,
  max: PACKS - 1,
}).map((index) => {
  const pack = packs[index];
  if (pack === undefined) {
    throw new Error('Pack index out of range');
  }
  return pack;
});

/** Pairs of packs to try as dependencies, in any order and including cycles. */
const candidatePairs = array(tuple(anyPack, anyPack), { maxLength: MAX_EDGES });

describe('loadOrder', () => {
  test('puts every pack after the packs it extends, the root last', () => {
    assert(
      property(acyclicEdges, anyPack, (edges, root) => {
        const order = loadOrder(edges, root);
        expect(order.at(-1)).toBe(root);
        for (const { pack, dependsOn } of edges) {
          const at = order.indexOf(pack);
          if (at !== -1) {
            expect(order.indexOf(dependsOn)).toBeGreaterThanOrEqual(0);
            expect(order.indexOf(dependsOn)).toBeLessThan(at);
          }
        }
      }),
    );
  });

  test('holds exactly the packs the root reaches, each once', () => {
    assert(
      property(acyclicEdges, anyPack, (edges, root) => {
        const order = loadOrder(edges, root);
        expect(new Set(order).size).toBe(order.length);
        expect(new Set(order)).toEqual(new Set(packs.filter((pack) => reaches(edges, root, pack))));
      }),
    );
  });

  test('is the same whichever order the edges are stored in', () => {
    assert(
      property(acyclicEdges, anyPack, (edges, root) => {
        expect(loadOrder(edges.toReversed(), root)).toEqual(loadOrder(edges, root));
      }),
    );
  });

  test('ends on a cycle in stored data instead of looping', () => {
    const [first, second] = packs;
    if (first === undefined || second === undefined) {
      throw new Error('No packs');
    }
    const edges = [
      { pack: first, dependsOn: second },
      { pack: second, dependsOn: first },
    ];
    expect(loadOrder(edges, first)).toHaveLength(2);
  });
});

describe('wouldCycle', () => {
  test('refuses an edge exactly when its target already reaches its source', () => {
    assert(
      property(acyclicEdges, anyPack, anyPack, (edges, pack, dependsOn) => {
        expect(wouldCycle(edges, { pack, dependsOn })).toBe(reaches(edges, dependsOn, pack));
      }),
    );
  });

  test('refuses a pack depending on itself', () => {
    assert(
      property(acyclicEdges, anyPack, (edges, pack) => {
        const selfEdge = { pack, dependsOn: pack };
        expect(wouldCycle(edges, selfEdge)).toBe(true);
      }),
    );
  });

  test('keeps the graph acyclic when only accepted edges are added', () => {
    assert(
      property(candidatePairs, (candidates) => {
        const accepted: PackDependencyEdge[] = [];
        for (const [pack, dependsOn] of candidates) {
          if (!wouldCycle(accepted, { pack, dependsOn })) {
            accepted.push({ pack, dependsOn });
          }
        }
        for (const { pack } of accepted) {
          const reachedAgain = accepted
            .filter((edge) => edge.pack === pack)
            .some((edge) => reaches(accepted, edge.dependsOn, pack));
          expect(reachedAgain).toBe(false);
        }
      }),
    );
  });
});
