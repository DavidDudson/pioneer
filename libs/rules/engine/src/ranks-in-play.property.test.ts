import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { array, assert, boolean, constantFrom, property, record, shuffledSubarray } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { ranksInPlay } from './ranks-in-play';
import type { RuleInPlay } from './rule-in-play';
import { inPlay } from './testing';

const SELECTORS = ['perception', 'save:will', 'class-dc'] as const;
const RANKS = ['trained', 'expert', 'master', 'legendary'] as const;
const ELEMENTS_MAX = 12;
/** Holds for a 1st-level character; fails for one below 5th. */
const AT_FIFTH = [{ gte: ['self:level', 5] }];
const facts = new PredicateFacts([RollOption.parse('self:level:1')], CORE_NAMESPACES);

interface Raise {
  readonly selector: (typeof SELECTORS)[number];
  readonly rank: (typeof RANKS)[number];
  /** Behind a predicate that fails at 1st level. */
  readonly gated: boolean;
}

const raise: Arbitrary<Raise> = record({
  selector: constantFrom(...SELECTORS),
  rank: constantFrom(...RANKS),
  gated: boolean(),
});

function rulesOf(raises: readonly Raise[]): RuleInPlay[] {
  return raises.map(({ selector, rank, gated }, rule) =>
    inPlay({ key: 'Proficiency', selector, rank, ...(gated ? { predicate: AT_FIFTH } : {}) }, 'feature', { rule }),
  );
}

function ranksOf(raises: readonly Raise[]): Record<string, string> {
  return Object.fromEntries(ranksInPlay({ rules: rulesOf(raises), facts }));
}

/** The highest rank each selector's ungated raises reach. */
function highest(raises: readonly Raise[]): Record<string, string> {
  const best = new Map<string, number>();
  for (const { selector, rank, gated } of raises) {
    if (!gated) {
      best.set(selector, Math.max(best.get(selector) ?? -1, RANKS.indexOf(rank)));
    }
  }
  return Object.fromEntries([...best].map(([selector, at]) => [selector, String(RANKS[at])]));
}

describe('ranksInPlay (properties)', () => {
  test('each selector reaches the highest raise whose predicate holds, and a failing one raises nothing', () => {
    assert(
      property(array(raise, { maxLength: ELEMENTS_MAX }), (raises) => {
        expect(ranksOf(raises)).toEqual(highest(raises));
      }),
    );
  });

  test('the order of the elements never changes the ranks', () => {
    assert(
      property(array(raise, { maxLength: ELEMENTS_MAX }), (raises) => {
        const reordered = shuffledSubarray(raises, { minLength: raises.length });
        assert(
          property(reordered, (shuffled) => {
            expect(ranksOf(shuffled)).toEqual(ranksOf(raises));
          }),
          { numRuns: 5 },
        );
      }),
    );
  });
});
