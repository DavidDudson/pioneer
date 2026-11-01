import { describe, expect, test } from 'bun:test';

import { AonUrl, PageNumber } from '@pioneer/rules/sdk';

import { pageIn, parseHits, replacements } from './parse.ts';

const hit = (url: string, markdown?: string, name?: string): unknown => ({
  _source: { url, name, type: 'Action', source_markdown: markdown },
});
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

  test('keeps a named hit as an entry whether or not it has a page', () => {
    const json = answer(
      hit('/Actions.aspx?ID=2254', '[Player Core](/Sources.aspx?ID=216)', 'Jinx'),
      hit('/Rules.aspx'),
    );
    const parsed = parseHits(json, '216');
    expect(parsed.entries.map(({ name, url }) => `${name} ${url}`)).toEqual([
      'Jinx https://2e.aonprd.com/Actions.aspx?ID=2254',
    ]);
    expect(parsed.pages.size).toBe(0);
  });

  test('rejects an answer of another shape', () => {
    expect(() => parseHits({ hits: {} }, '216')).toThrow();
  });
});

describe('replacements', () => {
  const legacy = AonUrl.parse('https://2e.aonprd.com/Feats.aspx?ID=1704');

  test('turns a remaster id of the same category into the legacy entry URL with that number', () => {
    expect(replacements('feat-1704', legacy, ['feat-4679'])).toEqual([
      AonUrl.parse('https://2e.aonprd.com/Feats.aspx?ID=4679'),
    ]);
  });

  test('leaves out another category, itself and a malformed id', () => {
    expect(replacements('feat-1704', legacy, ['spell-9', 'feat-1704', 'nonsense'])).toEqual([]);
  });

  test('has none without a document id', () => {
    expect(replacements(undefined, legacy, ['feat-4679'])).toEqual([]);
  });
});

describe('parseHits replacedBy', () => {
  test('keeps the replacements of a hit by its URL', () => {
    const json = answer({
      _id: 'feat-1704',
      _source: { url: '/Feats.aspx?ID=1704', name: 'Shield of Faith', type: 'Feat', remaster_id: ['feat-4679'] },
    });
    expect([...parseHits(json, '39').replacedBy]).toEqual([
      [
        AonUrl.parse('https://2e.aonprd.com/Feats.aspx?ID=1704'),
        [AonUrl.parse('https://2e.aonprd.com/Feats.aspx?ID=4679')],
      ],
    ]);
  });
});
