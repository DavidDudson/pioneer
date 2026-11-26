import { describe, expect, test } from 'bun:test';

import {
  pageName,
  representativeReports,
  toMarkdownTable,
  toPageResult,
  toTrackerEntries,
} from './page-budget-report.ts';
import type { LighthouseReport } from './page-budget-report.ts';

const CHARACTER_ID = '3f2c0d6e-0000-4000-8000-000000000001';

function report(url: string): LighthouseReport {
  return {
    finalDisplayedUrl: url,
    audits: {
      'largest-contentful-paint': { numericValue: 1234.6 },
      'resource-summary': {
        details: {
          items: [
            { resourceType: 'total', requestCount: 23, transferSize: 512_000 },
            { resourceType: 'script', requestCount: 9, transferSize: 400_000 },
          ],
        },
      },
    },
  };
}

describe('page budget report', () => {
  test('reads the total row and rounds the LCP', () => {
    expect(toPageResult('/characters', report('http://localhost:3000/characters'))).toEqual({
      page: '/characters',
      requests: 23,
      transferKb: 500,
      lcpMs: 1235,
    });
  });

  test('a report with no total row is an error', () => {
    const { audits, finalDisplayedUrl } = report('http://x/');
    const noTotal = { finalDisplayedUrl, audits: { ...audits, 'resource-summary': { details: { items: [] } } } };

    expect(() => toPageResult('/', noTotal)).toThrow('no total row');
  });

  test('names the sheet page without its character id', () => {
    expect(pageName(`http://localhost:3000/characters/${CHARACTER_ID}`, CHARACTER_ID)).toBe('/characters/:id');
    expect(pageName(`http://localhost:3000/characters/${CHARACTER_ID}/exploration/roleplay`, CHARACTER_ID)).toBe(
      '/characters/:id',
    );
    expect(pageName('http://localhost:3000/characters', CHARACTER_ID)).toBe('/characters');
  });

  test('keeps only the representative runs', () => {
    const manifest = [
      { jsonPath: 'a.json', isRepresentativeRun: false },
      { jsonPath: 'b.json', isRepresentativeRun: true },
    ];

    expect(representativeReports(manifest)).toEqual(['b.json']);
  });

  test('makes three tracker entries per page, one per unit', () => {
    const entries = toTrackerEntries([{ page: '/characters', requests: 23, transferKb: 500, lcpMs: 1235 }]);

    expect(entries.map(({ name, unit, value }) => [name, unit, value])).toEqual([
      ['page /characters: requests', 'requests', 23],
      ['page /characters: transfer', 'KB', 500],
      ['page /characters: LCP', 'ms', 1235],
    ]);
  });

  test('writes one table row per page', () => {
    const table = toMarkdownTable([{ page: '/characters', requests: 23, transferKb: 500, lcpMs: 1235 }]);

    expect(table.split('\n')).toHaveLength(3);
    expect(table).toContain('| /characters | 23 | 500 | 1235 |');
  });
});
