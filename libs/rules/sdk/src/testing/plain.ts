/** What a test compares with literals after `plain` has copied a value: primitives, and objects of any declared type. */
export type Plain = string | number | boolean | bigint | null | undefined | ReadonlyArray<Plain> | Readonly<object>;

/** `value` as the plain data it is made of, so a test compares it with literals rather than branded values. */
export function plain(value: Plain): Plain {
  return structuredClone(value);
}
