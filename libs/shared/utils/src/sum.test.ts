import { describe, expect, test } from 'bun:test';

import { sum } from './sum';

describe('sum', () => {
  test('adds the values', () => {
    expect(sum([1, 2, 3])).toBe(6);
  });

  test('an empty list is zero', () => {
    expect(sum([])).toBe(0);
  });

  test('reads any iterable', () => {
    expect(sum(new Set([4, 5]))).toBe(9);
  });
});
