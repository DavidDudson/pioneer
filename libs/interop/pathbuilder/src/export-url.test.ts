import { describe, expect, test } from 'bun:test';

import { exportUrlOf, ExportUrlProblem, looksLikeUrl, PathbuilderExportUrl } from './export-url';

const CLEAN = PathbuilderExportUrl.parse('https://pathbuilder2e.com/json.php?id=477708');

function problemOf(text: string): string | undefined {
  const result = exportUrlOf(text);
  return result.ok ? undefined : result.problem;
}

describe('exportUrlOf', () => {
  test('keeps the id only: tracking parameters and the fragment are dropped', () => {
    const result = exportUrlOf('https://pathbuilder2e.com/json.php?id=477708&fbclid=IwAR0abc#top');
    expect(result).toEqual({ ok: true, url: CLEAN });
  });

  test('reads the www host and an http link as the same clean URL', () => {
    expect(exportUrlOf('http://www.pathbuilder2e.com/json.php?id=477708')).toEqual({ ok: true, url: CLEAN });
    expect(exportUrlOf(`  ${CLEAN}  `)).toEqual({ ok: true, url: CLEAN });
  });

  test('refuses another host, including similar-looking hosts and ones that carry Pathbuilder’s name', () => {
    const foreign = [
      'https://example.com/json.php?id=1',
      'https://pathbuilder2e.com.evil.test/json.php?id=1',
      'https://evil.test/https://pathbuilder2e.com/json.php?id=1',
      'https://pathbuilder2e.com@evil.test/json.php?id=1',
      'https://127.0.0.1/json.php?id=1',
      'https://localhost/json.php?id=1',
    ];
    expect(foreign.map((url) => problemOf(url))).toEqual(foreign.map(() => ExportUrlProblem.ForeignHost));
  });

  test('refuses another path, a port and credentials on Pathbuilder’s host', () => {
    expect(problemOf('https://pathbuilder2e.com/admin?id=1')).toBe(ExportUrlProblem.ForeignHost);
    expect(problemOf('https://pathbuilder2e.com:8443/json.php?id=1')).toBe(ExportUrlProblem.ForeignHost);
    expect(problemOf('https://user:pass@pathbuilder2e.com/json.php?id=1')).toBe(ExportUrlProblem.ForeignHost);
  });

  test('refuses a missing or non-numeric id', () => {
    expect(problemOf('https://pathbuilder2e.com/json.php')).toBe(ExportUrlProblem.BadId);
    expect(problemOf('https://pathbuilder2e.com/json.php?id=abc')).toBe(ExportUrlProblem.BadId);
    expect(problemOf('https://pathbuilder2e.com/json.php?id=12%2F..%2F34')).toBe(ExportUrlProblem.BadId);
    expect(problemOf('https://pathbuilder2e.com/json.php?id=')).toBe(ExportUrlProblem.BadId);
  });

  test('refuses text that is not an http link', () => {
    expect(problemOf('not a url')).toBe(ExportUrlProblem.NotUrl);
    expect(problemOf('ftp://pathbuilder2e.com/json.php?id=1')).toBe(ExportUrlProblem.NotUrl);
    expect(problemOf('file:///etc/passwd')).toBe(ExportUrlProblem.NotUrl);
  });
});

describe('looksLikeUrl', () => {
  test('tells a pasted link from pasted JSON', () => {
    expect(looksLikeUrl(` ${CLEAN}`)).toBe(true);
    expect(looksLikeUrl('{"success":true}')).toBe(false);
    expect(looksLikeUrl('')).toBe(false);
  });
});
