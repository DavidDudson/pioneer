import { describe, expect, test } from 'bun:test';

import { sweepOf } from './generation-sweep';

const FULL_RUNS = 12;
const LEVEL_COUNT = 20;
const REPLAY_SEED = 42;

describe('sweepOf', () => {
  test('is the pull request sweep by default: capped runs, a fixed seed, fewer levels', () => {
    const sweep = sweepOf({});
    const first = sweep.parameters(FULL_RUNS);
    expect(first.numRuns).toBeLessThan(FULL_RUNS);
    expect(first.seed).toBeDefined();
    expect(sweepOf({}).parameters(FULL_RUNS)).toEqual(first);
    expect(sweep.spotLevels.length).toBeLessThan(LEVEL_COUNT);
    expect(sweep.propertyLevels.length).toBeLessThan(LEVEL_COUNT);
  });

  test('never makes more runs than the full sweep does', () => {
    expect(sweepOf({}).parameters(1).numRuns).toBe(1);
  });

  test('the full sweep makes every run, over every level, from a seed fast-check draws', () => {
    const sweep = sweepOf({ GENERATION_SWEEP: 'full' });
    expect(sweep.parameters(FULL_RUNS)).toEqual({ numRuns: FULL_RUNS });
    expect(sweep.propertyLevels).toHaveLength(LEVEL_COUNT);
    expect(sweep.spotLevels.length).toBeGreaterThan(sweepOf({}).spotLevels.length);
  });

  test('a seed and path replay a run', () => {
    const sweep = sweepOf({ GENERATION_SWEEP: 'full', GENERATION_SEED: `${REPLAY_SEED}`, GENERATION_PATH: '3:1' });
    expect(sweep.parameters(FULL_RUNS)).toEqual({ numRuns: FULL_RUNS, seed: REPLAY_SEED, path: '3:1' });
  });

  test('an unknown sweep throws', () => {
    expect(() => sweepOf({ GENERATION_SWEEP: 'nightly' })).toThrow();
  });
});
