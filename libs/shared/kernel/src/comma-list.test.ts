import { describe, expect, test } from 'bun:test';

import * as z from 'zod';

import { commaList } from './comma-list';

const Colours = z.enum(['red', 'green', 'blue']);
const MOST = 2;
const Query = z.strictObject({ colours: commaList(Colours, MOST) });

describe('commaList', () => {
  test('splits the value on commas', () => {
    expect(Query.parse({ colours: 'red,blue' })).toStrictEqual({ colours: ['red', 'blue'] });
  });

  test('an absent or empty value is an empty list', () => {
    expect(Query.parse({})).toStrictEqual({ colours: [] });
    expect(Query.parse({ colours: '' })).toStrictEqual({ colours: [] });
  });

  test('an unknown item is rejected', () => {
    expect(Query.safeParse({ colours: 'red,pink' }).success).toBe(false);
  });

  test('more than the most items is rejected', () => {
    expect(Query.safeParse({ colours: 'red,green,blue' }).success).toBe(false);
  });

  test('encodes back to the wire form', () => {
    expect(z.encode(Query, { colours: ['green', 'blue'] })).toStrictEqual({ colours: 'green,blue' });
  });
});
