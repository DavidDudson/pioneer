import { describe, expect, test } from 'bun:test';

import * as z from 'zod';

import { Pg } from './pg';

describe('Pg', () => {
  test('smallint enforces int2 bounds', () => {
    expect(Pg.smallint().safeParse(32_767).success).toBe(true);
    expect(Pg.smallint().safeParse(32_768).success).toBe(false);
    expect(Pg.smallint().safeParse(1.5).success).toBe(false);
  });

  test('integer enforces int4 bounds', () => {
    expect(Pg.integer().safeParse(2_147_483_647).success).toBe(true);
    expect(Pg.integer().safeParse(2_147_483_648).success).toBe(false);
  });

  test('bigint round-trips through a decimal string', () => {
    const value = z.decode(Pg.bigint(), '9223372036854775807');
    expect(value).toBe(9_223_372_036_854_775_807n);
    expect(z.encode(Pg.bigint(), value)).toBe('9223372036854775807');
    expect(Pg.bigint().safeParse('9223372036854775808').success).toBe(false);
  });

  test('numeric checks precision and scale without floats', () => {
    const money = Pg.numeric(5, 2);
    expect(money.safeParse('123.45').success).toBe(true);
    expect(money.safeParse('-0.5').success).toBe(true);
    expect(money.safeParse('1234.5').success).toBe(false);
    expect(money.safeParse('1.234').success).toBe(false);
    expect(money.safeParse('1e3').success).toBe(false);
  });

  test('varchar enforces length', () => {
    expect(Pg.varchar(3).safeParse('abcd').success).toBe(false);
  });
});
