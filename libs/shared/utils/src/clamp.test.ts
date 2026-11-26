import { describe, expect, test } from 'bun:test';

import { clamp } from './clamp';

describe('clamp', () => {
  test('holds a value inside the bounds', () => {
    expect(clamp(3, 0, 5)).toBe(3);
  });

  test('raises a value below the minimum and lowers one above the maximum', () => {
    expect(clamp(-2, 0, 5)).toBe(0);
    expect(clamp(7, 0, 5)).toBe(5);
  });

  test('includes both bounds', () => {
    expect(clamp(0, 0, 5)).toBe(0);
    expect(clamp(5, 0, 5)).toBe(5);
  });
});
