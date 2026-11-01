import { describe, expect, test } from 'bun:test';

import { canonicalJson } from './canonical-json.ts';

const LONG = 'x'.repeat(50);

describe('canonicalJson', () => {
  test('expands objects and arrays of objects, whatever the input held', () => {
    expect(canonicalJson({ outer: { inner: 1 }, list: [{ item: 2 }] })).toBe(
      '{\n  "outer": {\n    "inner": 1\n  },\n  "list": [\n    {\n      "item": 2\n    }\n  ]\n}\n',
    );
  });

  test('keeps an array of scalars on one line when it fits, and breaks it one item to a line when it does not', () => {
    expect(canonicalJson({ traits: ['aa', 'bb'] })).toBe('{\n  "traits": ["aa", "bb"]\n}\n');
    expect(canonicalJson({ traits: [LONG, LONG, LONG] })).toBe(
      `{\n  "traits": [\n    "${LONG}",\n    "${LONG}",\n    "${LONG}"\n  ]\n}\n`,
    );
  });

  test('breaks an array of arrays that each hold two or more, and keeps the others on a line', () => {
    const wide = [
      ['one', 'two'],
      ['three', 'four'],
    ];

    expect(canonicalJson(wide)).toBe('[\n  ["one", "two"],\n  ["three", "four"]\n]\n');
    expect(canonicalJson([['one'], ['two', 'three']])).toBe('[["one"], ["two", "three"]]\n');
  });

  test('prints empty containers compactly', () => {
    expect(canonicalJson({ rules: [], extra: {} })).toBe('{\n  "rules": [],\n  "extra": {}\n}\n');
  });

  test('gives the same text for the same data, however the source text was laid out', () => {
    const data = { id: 'abc', traits: ['one'], sources: [{ kind: 'book', page: 1 }] };
    const compact = JSON.stringify(data);
    const wide = JSON.stringify(data, undefined, 4);

    expect(canonicalJson(JSON.parse(compact))).toBe(canonicalJson(JSON.parse(wide)));
  });

  test('round trips: the text parses to the data', () => {
    const data = { list: [1, 2, { inner: [[], {}] }], text: 'é"\\' };

    expect(JSON.parse(canonicalJson(data))).toEqual(data);
  });
});
