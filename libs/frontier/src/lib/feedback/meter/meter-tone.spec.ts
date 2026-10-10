import { describe, expect, it } from 'vitest';

import { MeterTone, meterTone } from './meter-tone';
import type { MeterRange } from './meter-tone';

/** HP out of 40: low at a quarter, high at half, optimum full. */
const HP: Omit<MeterRange, 'value'> = {
  min: 0,
  max: 40,
  low: 10,
  high: 20,
  optimum: 40,
};
/** Dying 0-4: optimum none, low 1, high 2. */
const DYING: Omit<MeterRange, 'value'> = {
  min: 0,
  max: 4,
  low: 1,
  high: 2,
  optimum: 0,
};

describe(meterTone, () => {
  it('is the accent without low or high, whatever the value', () => {
    expect(meterTone({ ...HP, low: undefined, high: undefined, value: 0 })).toBe(MeterTone.Accent);
    expect(meterTone({ ...HP, low: undefined, high: undefined, value: 40 })).toBe(MeterTone.Accent);
  });

  it('goes success, warning, danger as a high-is-good value falls', () => {
    expect([40, 20, 19, 10, 9, 0].map((value) => meterTone({ ...HP, value }))).toStrictEqual([
      MeterTone.Success,
      MeterTone.Success,
      MeterTone.Warning,
      MeterTone.Warning,
      MeterTone.Danger,
      MeterTone.Danger,
    ]);
  });

  it('goes success, warning, danger as a low-is-good value rises', () => {
    expect([0, 1, 2, 3, 4].map((value) => meterTone({ ...DYING, value }))).toStrictEqual([
      MeterTone.Success,
      MeterTone.Success,
      MeterTone.Warning,
      MeterTone.Danger,
      MeterTone.Danger,
    ]);
  });

  it('warns at both ends when the optimum sits between low and high', () => {
    const range = { min: 0, max: 10, low: 3, high: 7, optimum: 5 };
    expect([0, 5, 10].map((value) => meterTone({ ...range, value }))).toStrictEqual([
      MeterTone.Warning,
      MeterTone.Success,
      MeterTone.Warning,
    ]);
  });

  it('clamps values and thresholds into min..max, as the browser does', () => {
    expect(meterTone({ ...HP, value: 99 })).toBe(MeterTone.Success);
    expect(meterTone({ ...HP, value: -5 })).toBe(MeterTone.Danger);
    expect(meterTone({ ...HP, optimum: 99, value: 40 })).toBe(MeterTone.Success);
  });

  it('defaults the optimum to the midpoint', () => {
    expect(meterTone({ ...HP, optimum: undefined, value: 15 })).toBe(MeterTone.Success);
    expect(meterTone({ ...HP, optimum: undefined, value: 30 })).toBe(MeterTone.Warning);
  });
});
