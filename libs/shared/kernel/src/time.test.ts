import { describe, expect, test } from 'bun:test';

import { z } from 'zod';

import { fixedClock } from './clock';
import { Temporal } from './temporal';
import { InstantCodec, PlainDateCodec } from './temporal-codecs';

describe('time codecs', () => {
  test('instant round-trips through ISO', () => {
    const instant = z.decode(InstantCodec, '2026-10-07T10:00:00.000Z');
    expect(instant).toBeInstanceOf(Temporal.Instant);
    expect(z.encode(InstantCodec, instant)).toBe('2026-10-07T10:00:00.000Z');
  });

  test('plain date round-trips through ISO', () => {
    const date = z.decode(PlainDateCodec, '2026-10-07');
    expect(date.dayOfWeek).toBe(3);
    expect(z.encode(PlainDateCodec, date)).toBe('2026-10-07');
  });

  test('rejects non-ISO input', () => {
    expect(InstantCodec.safeParse('yesterday').success).toBe(false);
  });

  test('fixed clock is frozen', () => {
    const clock = fixedClock('2026-01-01T00:00:00Z');
    expect(clock.now().equals(clock.now())).toBe(true);
  });
});

describe('time codecs reject what Temporal rejects', () => {
  test('too many fraction digits is a validation issue, not an exception', () => {
    const result = InstantCodec.safeParse('2026-10-07T10:00:00.1234567890123Z');
    expect(result.success).toBe(false);
  });

  test('non-UTC and non-millisecond forms are not canonical', () => {
    expect(InstantCodec.safeParse('2026-10-07T10:00:00Z').success).toBe(false);
    expect(InstantCodec.safeParse('2026-10-07T10:00:00.000+02:00').success).toBe(false);
  });
});
