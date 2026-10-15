import { describe, expect, test } from 'bun:test';

import { BENCH_MARKER } from '@pioneer/shared/bench';
import type { BenchResult } from '@pioneer/shared/bench';

import { parseResults, toMarkdownTable, toTrackerEntries } from './bench-report.ts';

const BUDGETED: BenchResult = {
  name: 'grants: a',
  fastestMs: 0.2,
  medianMs: 0.25,
  timedRuns: 51,
  warmupRuns: 20,
  budgetMs: 3,
};
const UNBUDGETED: BenchResult = { name: 'grants: b', fastestMs: 1, medianMs: 1.5, timedRuns: 11, warmupRuns: 2 };

describe('parseResults', () => {
  test('reads the marker lines and skips the rest', () => {
    const output = ['noise', `${BENCH_MARKER}${JSON.stringify(BUDGETED)}`, 'grants: a: fastest 0.2 ms'].join('\n');
    expect(parseResults(output)).toStrictEqual([BUDGETED]);
  });

  test('throws on a marker line that is not a result', () => {
    expect(() => parseResults(`${BENCH_MARKER}{"name":"x"}`)).toThrow();
  });
});

describe('toTrackerEntries', () => {
  test('tracks the fastest run and carries the median and budget as context', () => {
    expect(toTrackerEntries([BUDGETED, UNBUDGETED])).toStrictEqual([
      { name: 'grants: a', unit: 'ms', value: 0.2, extra: 'median 0.25 ms, 51 runs after 20 warm-up, budget 3 ms' },
      { name: 'grants: b', unit: 'ms', value: 1, extra: 'median 1.5 ms, 11 runs after 2 warm-up' },
    ]);
  });
});

describe('toMarkdownTable', () => {
  test('has a row per result, with the budget cell empty when there is none', () => {
    expect(toMarkdownTable([BUDGETED, UNBUDGETED]).split('\n')).toStrictEqual([
      '| Benchmark | Fastest (ms) | Median (ms) | Budget (ms) |',
      '| --- | ---: | ---: | ---: |',
      '| grants: a | 0.2 | 0.25 | 3 |',
      '| grants: b | 1 | 1.5 |  |',
    ]);
  });
});
