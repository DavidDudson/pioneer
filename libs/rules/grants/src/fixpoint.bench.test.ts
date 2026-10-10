import { expect, test } from 'bun:test';

import { resolveGrants } from './resolve-grants';
import type { GrantInputs } from './resolve-grants';
import { inputsOf, picked, picksOf } from './testing/builders';
import { FIGHTER_CONTENT, LEVEL_20_PICKS } from './testing/fighter';

const WARMUP_RUNS = 20;
const TIMED_RUNS = 51;
/** The issue's budget for a level 20 character, within the 10 ms budget for a whole derivation. */
const BUDGET_MS = 3;

/** The golden Fighter at 20th level with every slot picked. */
function inputs(): GrantInputs {
  return inputsOf({
    entries: FIGHTER_CONTENT,
    roots: [picked('fighter', 'class')],
    level: 20,
    picks: picksOf(LEVEL_20_PICKS),
  });
}

/**
 * The fastest of `times`, in milliseconds. Other work on the machine (CI runs projects in parallel) only ever adds
 * time, so the fastest run is the closest to what resolution itself costs.
 */
function fastestOf(times: readonly number[]): number {
  return Math.min(...times);
}

test(`a level 20 Fighter resolves to a fixpoint in under ${BUDGET_MS} ms`, () => {
  for (let run = 0; run < WARMUP_RUNS; run += 1) {
    resolveGrants(inputs());
  }
  const times = Array.from({ length: TIMED_RUNS }, (): number => {
    const given = inputs();
    const start = performance.now();
    resolveGrants(given);
    return performance.now() - start;
  });
  expect(resolveGrants(inputs()).answered).toHaveLength(LEVEL_20_PICKS.length);
  expect(fastestOf(times)).toBeLessThan(BUDGET_MS);
});
