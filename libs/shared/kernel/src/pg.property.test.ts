import { describe, expect, test } from 'bun:test';

import { assert, bigInt, boolean, integer, nat, property, record, stringMatching } from 'fast-check';

import { Pg } from './pg';

const SMALLINT_MIN = -32_768;
const SMALLINT_MAX = 32_767;
const MAX_DIGITS = 12;

/** Decimal strings with a known number of whole and fraction digits. */
const decimal = record({
  negative: boolean(),
  whole: stringMatching(/^[1-9]\d{0,11}$/u),
  fraction: stringMatching(/^\d{0,12}$/u),
}).map(({ negative, whole, fraction }) => ({
  text: `${negative ? '-' : ''}${whole}${fraction === '' ? '' : `.${fraction}`}`,
  wholeDigits: whole.length,
  fractionDigits: fraction.length,
}));

describe('Pg (properties)', () => {
  test('smallint accepts exactly the int2 range', () => {
    assert(
      property(integer(), (value) => {
        expect(Pg.smallint().safeParse(value).success).toBe(value >= SMALLINT_MIN && value <= SMALLINT_MAX);
      }),
    );
  });

  test('numeric(p, s) accepts a decimal iff its digits fit', () => {
    assert(
      property(decimal, integer({ min: 1, max: MAX_DIGITS }), nat(MAX_DIGITS), (value, precision, rawScale) => {
        const scale = Math.min(rawScale, precision);
        const fits = value.fractionDigits <= scale && value.wholeDigits <= precision - scale;
        expect(Pg.numeric(precision, scale).safeParse(value.text).success).toBe(fits);
      }),
    );
  });

  test('bigint codec round-trips every int8', () => {
    assert(
      property(bigInt({ min: -(2n ** 63n), max: 2n ** 63n - 1n }), (value) => {
        const codec = Pg.bigint();
        expect(codec.parse(codec.encode(value))).toBe(value);
      }),
    );
  });
});
