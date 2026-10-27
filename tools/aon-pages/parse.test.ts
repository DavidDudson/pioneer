import { describe, expect, test } from 'bun:test';

import { AonUrl, PageNumber } from '@pioneer/rules/sdk';

import { pageIn, parseHits } from './parse.ts';

const hit = (url: string, markdown?: string): unknown => ({ _source: { url, source_markdown: markdown } });
const answer = (...hits: unknown[]): unknown => ({ hits: { total: { value: 9 }, hits } });

describe('pageIn', () => {
  test('reads the page printed for the asked book', () => {
    expect(pageIn('[Player Core](/Sources.aspx?ID=216) pg. 331', '216')).toBe(PageNumber.parse(331));
  });

  test('picks the asked book when an entry is printed in several', () => {
    const markdown = '[Core Rulebook](/Sources.aspx?ID=1) pg. 12, [Player Core](/Sources.aspx?ID=216) pg. 331';
    expect(pageIn(markdown, '216')).toBe(PageNumber.parse(331));
  });

  test('does not match a longer id', () => {
    expect(pageIn('[X](/Sources.aspx?ID=2160) pg. 5', '216')).toBeUndefined();
  });

  test('has no page when the book prints none', () => {
    expect(pageIn('[Player Core](/Sources.aspx?ID=216)', '216')).toBeUndefined();
  });
});

describe('parseHits', () => {
  test('keeps the page by entry URL and counts the hits it cannot use', () => {
    const json = answer(
      hit('/Spells.aspx?ID=1530', '[Player Core](/Sources.aspx?ID=216) pg. 331'),
      hit('/Spells.aspx?ID=1', '[Other](/Sources.aspx?ID=9) pg. 1'),
      hit('/Rules.aspx', '[Player Core](/Sources.aspx?ID=216) pg. 2'),
    );
    const parsed = parseHits(json, '216');
    expect([...parsed.pages]).toEqual([
      [AonUrl.parse('https://2e.aonprd.com/Spells.aspx?ID=1530'), PageNumber.parse(331)],
    ]);
    expect(parsed).toMatchObject({ total: 9, count: 3, skipped: 2 });
  });

  test('rejects an answer of another shape', () => {
    expect(() => parseHits({ hits: {} }, '216')).toThrow();
  });
});
