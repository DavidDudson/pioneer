import { describe, expect, test } from 'bun:test';

import { z } from 'zod';

import { fixedClock } from './clock';
import { Temporal } from './temporal';
import { InstantCodec, PlainDateCodec } from './temporal-codecs';

describe('time codecs', () => {
  test('instant round-trips through ISO', () => {
    const instant = z.decode(InstantCodec, '2026-10-07T10:00:00Z');
    expect(instant).toBeInstanceOf(Temporal.Instant);
    expect(z.encode(InstantCodec, instant)).toBe('2026-10-07T10:00:00Z');
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
