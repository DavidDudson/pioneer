import { describe, expect, test } from 'bun:test';

import type { CharacterLevel } from '@pioneer/character/domain';

import { sweepOf } from './generation-sweep';

const FULL_RUNS = 12;
const LEVEL_COUNT = 20;
const REPLAY_SEED = 42;
const PR_SPOT_LEVELS = [1, 20];
const PR_PROPERTY_LEVELS = [1, 10, 20];
const FULL_SPOT_LEVELS = [1, 5, 10, 15, 20];
const ALL_LEVELS = Array.from({ length: LEVEL_COUNT }, (_unused, index) => index + 1);

/** The levels as plain numbers, to compare with the numbers the sweep should hold. */
function plain(levels: ReadonlyArray<CharacterLevel>): ReadonlyArray<number> {
  return levels.map(Number);
}

describe('sweepOf', () => {
  test('is the pull request sweep by default: capped runs, a fixed seed, fewer levels', () => {
    const sweep = sweepOf({});
    const first = sweep.parameters(FULL_RUNS);
    expect(first.numRuns).toBeLessThan(FULL_RUNS);
    expect(first.seed).toBeDefined();
    expect(sweepOf({}).parameters(FULL_RUNS)).toEqual(first);
    expect(plain(sweep.spotLevels)).toEqual(PR_SPOT_LEVELS);
    expect(plain(sweep.propertyLevels)).toEqual(PR_PROPERTY_LEVELS);
  });

  test('never makes more runs than the full sweep does', () => {
    expect(sweepOf({}).parameters(1).numRuns).toBe(1);
  });

  test('the full sweep makes every run, over every level, from a seed fast-check draws', () => {
    const sweep = sweepOf({ GENERATION_SWEEP: 'full' });
    expect(sweep.parameters(FULL_RUNS)).toEqual({ numRuns: FULL_RUNS });
    expect(plain(sweep.spotLevels)).toEqual(FULL_SPOT_LEVELS);
    expect(plain(sweep.propertyLevels)).toEqual(ALL_LEVELS);
  });

  test('a seed and path replay a full run', () => {
    const sweep = sweepOf({ GENERATION_SWEEP: 'full', GENERATION_SEED: `${REPLAY_SEED}`, GENERATION_PATH: '3:1' });
    expect(sweep.parameters(FULL_RUNS)).toEqual({ numRuns: FULL_RUNS, seed: REPLAY_SEED, path: '3:1' });
  });

  test('a seed replaces the fixed one on a pull request run, which stays capped', () => {
    const { numRuns, seed } = sweepOf({ GENERATION_SEED: `${REPLAY_SEED}` }).parameters(FULL_RUNS);
    expect(seed).toBe(REPLAY_SEED);
    expect(numRuns).toBeLessThan(FULL_RUNS);
  });

  test('a path without the full sweep throws, since the capped run cannot reach it', () => {
    expect(() => sweepOf({ GENERATION_PATH: '3:1' })).toThrow();
  });

  test('an unknown sweep throws', () => {
    expect(() => sweepOf({ GENERATION_SWEEP: 'nightly' })).toThrow();
  });

  test.each(['-1', '1.5', 'abc', ''])('the seed %p throws', (seed) => {
    expect(() => sweepOf({ GENERATION_SEED: seed })).toThrow();
  });
});
