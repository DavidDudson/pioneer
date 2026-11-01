import { afterEach, describe, expect, spyOn, test } from 'bun:test';

import { benchmark, budgetFor, CI_RUNNER_MULTIPLIER, median, summarise } from './bench';

describe('median', () => {
  test('is the middle timing of an odd count', () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  test('is the mean of the two in the middle of an even count', () => {
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});

describe('summarise', () => {
  test('reports the fastest and the median to three decimals', () => {
    expect(summarise({ name: 'x' }, [0.30001, 0.2000049, 0.4], 5)).toStrictEqual({
      name: 'x',
      fastestMs: 0.2,
      medianMs: 0.3,
      timedRuns: 3,
      warmupRuns: 5,
    });
  });

  test('carries the budget when there is one', () => {
    expect(summarise({ name: 'x', budgetMs: 2 }, [1], 0).budgetMs).toBe(2);
  });
});

describe('benchmark', () => {
  test('warms up, then times each run on fresh input', () => {
    let prepared = 0;
    let ran = 0;
    const result = benchmark({
      name: 'counts',
      prepare: (): number => {
        prepared += 1;
        return prepared;
      },
      run: (): void => {
        ran += 1;
      },
      warmupRuns: 2,
      timedRuns: 3,
    });
    expect(prepared).toBe(5);
    expect(ran).toBe(5);
    expect(result.timedRuns).toBe(3);
    expect(result.budgetMs).toBeUndefined();
  });
});

describe('budgetFor', () => {
  test('is the budget as given on a dev machine', () => {
    expect(budgetFor(4, false)).toBe(4);
  });

  test('scales the budget by the CI multiplier on a runner', () => {
    expect(budgetFor(4, true)).toBe(4 * CI_RUNNER_MULTIPLIER);
  });

  test('stays absent when there is no budget', () => {
    expect(budgetFor(undefined, true)).toBeUndefined();
  });
});

describe('benchmark retries', () => {
  afterEach(() => {
    process.exitCode = 0;
  });

  test('passes a case that is slow in its first round only', () => {
    const log = spyOn(console, 'log').mockReturnValue(undefined);
    let calls = 0;
    const result = benchmark({
      name: 'slow once',
      budgetMs: 20,
      warmupRuns: 0,
      timedRuns: 2,
      prepare: () => undefined,
      run: () => {
        calls += 1;
        // Calls 1 and 2 (the first round) take 80 and 40 ms; later calls are instant.
        const until = performance.now() + Math.max(0, 120 - 40 * calls);
        while (performance.now() < until) {
          // Busy wait: the first round is over the budget.
        }
      },
    });
    log.mockRestore();
    expect(result.fastestMs).toBeLessThan(20);
    expect(process.exitCode).not.toBe(1);
  });

  test('fails a case that stays over its budget in every round', () => {
    const log = spyOn(console, 'log').mockReturnValue(undefined);
    const error = spyOn(console, 'error').mockReturnValue(undefined);
    benchmark({
      name: 'always slow',
      budgetMs: 5,
      warmupRuns: 0,
      timedRuns: 1,
      prepare: () => undefined,
      run: () => {
        const until = performance.now() + 10;
        while (performance.now() < until) {
          // Busy wait: every round is over the budget.
        }
      },
    });
    log.mockRestore();
    error.mockRestore();
    expect(process.exitCode).toBe(1);
  });
});
