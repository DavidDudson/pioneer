import { describe, expect, test } from 'bun:test';

import { assert, pre, property, string } from 'fast-check';

import { ContentNamespace, derivedId, Uuid } from './id';

describe('ids (properties)', () => {
  test('derivedId is a valid, deterministic UUIDv5 for any name', () => {
    assert(
      property(string(), (name) => {
        const id = derivedId(ContentNamespace, name);
        expect(Uuid.safeParse(id).success).toBe(true);
        expect(id[14]).toBe('5');
        expect(derivedId(ContentNamespace, name)).toBe(id);
      }),
    );
  });

  test('different names give different ids', () => {
    assert(
      property(string(), string(), (left, right) => {
        pre(left !== right);
        expect(derivedId(ContentNamespace, left)).not.toBe(derivedId(ContentNamespace, right));
      }),
    );
  });
});
