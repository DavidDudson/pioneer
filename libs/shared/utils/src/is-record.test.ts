import { describe, expect, test } from 'bun:test';

import { isRecord } from './is-record';

describe('isRecord', () => {
  test('accepts plain objects', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ key: 1 })).toBe(true);
  });

  test('rejects null, arrays and primitives', () => {
    // oxlint-disable-next-line unicorn/no-null -- null is the case under test
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord('text')).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });
});
