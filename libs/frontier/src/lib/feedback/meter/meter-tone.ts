import type { ValueOf } from '@pioneer/shared/kernel';

/** The colour a meter's fill takes. */
export const MeterTone = {
  /** No thresholds given: a plain amount, neither good nor bad. */
  Accent: 'accent',
  /** In the optimum range. */
  Success: 'success',
  /** One range away from the optimum. */
  Warning: 'warning',
  /** Two ranges away: the far end from the optimum. */
  Danger: 'danger',
} as const;
export type MeterTone = ValueOf<typeof MeterTone>;

export interface MeterRange {
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly low: number | undefined;
  readonly high: number | undefined;
  readonly optimum: number | undefined;
}

/**
 * The tone for a value, by the HTML `<meter>` rules so it matches what the browser reports: low and high split
 * min..max into three ranges, and optimum says which range is good. A value in the optimum's range is success,
 * the next range warning, the far range danger. With optimum inside low..high both outer ranges are warning.
 * Without low or high the meter is a plain amount (accent).
 */
export function meterTone({ value, min, max, low, high, optimum }: MeterRange): MeterTone {
  if (low === undefined && high === undefined) {
    return MeterTone.Accent;
  }
  const clamp = (amount: number, from: number): number => Math.min(Math.max(amount, from), max);
  const current = clamp(value, min);
  const lowBound = clamp(low ?? min, min);
  const highBound = clamp(high ?? max, lowBound);
  const best = clamp(optimum ?? (min + max) / 2, min);

  if (best < lowBound) {
    return rank(current <= lowBound, current <= highBound);
  }
  if (best > highBound) {
    return rank(current >= highBound, current >= lowBound);
  }
  return current >= lowBound && current <= highBound ? MeterTone.Success : MeterTone.Warning;
}

/** Success in the optimum's own range, warning in the next, danger beyond. */
function rank(inOptimumRange: boolean, inNextRange: boolean): MeterTone {
  if (inOptimumRange) {
    return MeterTone.Success;
  }
  return inNextRange ? MeterTone.Warning : MeterTone.Danger;
}
