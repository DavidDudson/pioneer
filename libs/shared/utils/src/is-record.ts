/** Whether `value` is a plain object (not null, not an array), so its keys can be read. */
// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- the guard exists to narrow input no schema has read yet
export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- this is the narrowing every caller would otherwise repeat
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
