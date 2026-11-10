import { describe, expect, it } from 'bun:test';

import { groupBundles, median, summarise, waterfallTable } from './sheet-waterfall-stats.ts';
import type { SheetLoad } from './sheet-waterfall-stats.ts';

function load(readyMs: number, rows: SheetLoad['rows'] = []): SheetLoad {
  return { rows, headerMs: readyMs / 2, readyMs };
}

describe('median', () => {
  it('is the middle of an odd count and the mean of the middle two of an even one', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe('summarise', () => {
  it('takes the medians and shows the waterfall of the run nearest the median time to ready', () => {
    const slow = load(900, [{ name: '/slow', startMs: 0, endMs: 1, bytes: 1 }]);
    const middle = load(500, [
      { name: '/b', startMs: 20, endMs: 30, bytes: 10 },
      { name: '/a', startMs: 5, endMs: 15, bytes: 20 },
    ]);
    const fast = load(100, []);

    const summary = summarise([slow, middle, fast]);

    expect(summary).toMatchObject({ runs: 3, requests: 1, bytes: 1, readyMs: 500, headerMs: 250 });
    expect(summary.waterfall.map((row) => row.name)).toStrictEqual(['/a', '/b']);
  });
});

describe('waterfallTable', () => {
  it('lists each request with when it started and ended', () => {
    expect(waterfallTable([{ name: '/x', startMs: 1.26, endMs: 2, bytes: 3 }])).toContain('| /x | 1.3 | 2 | 3 |');
  });
});

describe('groupBundles', () => {
  it('joins the content bundle files into one row spanning them, and keeps the other requests in start order', () => {
    const rows = [
      { name: '/api/content/bundles/a/x.json', startMs: 30, endMs: 40, bytes: 5 },
      { name: '/api/characters/1/sheet', startMs: 10, endMs: 20, bytes: 7 },
      { name: '/api/content/bundles/a/y.json', startMs: 35, endMs: 60, bytes: 6 },
    ];

    expect(groupBundles(rows)).toStrictEqual([
      { name: '/api/characters/1/sheet', startMs: 10, endMs: 20, bytes: 7 },
      { name: '/api/content/bundles/* (2 files)', startMs: 30, endMs: 60, bytes: 11 },
    ]);
  });
});
