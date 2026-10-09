import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { assert, integer, property, shuffledSubarray, subarray, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import type { GrantEntry } from './grant-entry';
import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import { entry, grantOf, idOf, lookupOf, picked } from './testing/builders';

const ENTRIES_MAX = 10;

/** Content, its roots, and the same roots in another order. */
type Drawn = [GrantEntry[], number[], number[]];

const slugOf = (index: number): string => `entry-${index}`;

/** 0 to `count - 1`. */
const indexes = (count: number): number[] => Array.from({ length: count }, (_value, index) => index);

/** Entry `index`, granting some of the entries after it, so the grants never loop. */
function entryAt(index: number, count: number): Arbitrary<GrantEntry> {
  const later = indexes(count).slice(index + 1);
  return subarray(later).map((grants) =>
    entry(
      slugOf(index),
      grants.map((target) => grantOf(slugOf(target))),
    ),
  );
}

/** Acyclic content, and some of its entries as roots. */
const acyclic: Arbitrary<[GrantEntry[], number[]]> = integer({ min: 1, max: ENTRIES_MAX }).chain((count) =>
  tuple(tuple(...indexes(count).map((index) => entryAt(index, count))), subarray(indexes(count), { minLength: 1 })),
);

function resolve(content: readonly GrantEntry[], roots: readonly number[]): GrantResolution {
  return resolveGrants({
    roots: roots.map((index) => picked(slugOf(index))),
    lookup: lookupOf(content),
    facts: new PredicateFacts([]),
  });
}

describe('resolveGrants properties', () => {
  test('acyclic grants always resolve, with every reachable entry on the character once', () => {
    assert(
      property(acyclic, ([content, roots]) => {
        const result = resolve(content, roots);
        expect(result.errors).toEqual([]);
        const ids = result.items.map((item) => item.entry.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const root of roots) {
          expect(ids).toContain(idOf(slugOf(root)));
        }
      }),
    );
  });

  test('the result does not depend on the order the roots are given in', () => {
    const shuffled = acyclic.chain(([content, roots]) =>
      shuffledSubarray(roots, { minLength: roots.length }).map((order): Drawn => [content, roots, order]),
    );
    assert(
      property(shuffled, ([content, roots, order]) => {
        expect(resolve(content, order)).toEqual(resolve(content, roots));
      }),
    );
  });
});
