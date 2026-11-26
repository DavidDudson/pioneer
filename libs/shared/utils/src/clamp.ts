/** `value` held between `min` and `max`, both included: `clamp(7, 0, 5)` is `5`. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
