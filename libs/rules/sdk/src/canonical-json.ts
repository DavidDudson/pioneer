import * as z from 'zod';

/** JSON text written so equal values give equal text, whatever order their keys were written in. */
export const CanonicalJson = z.string().brand<'CanonicalJson'>();
export type CanonicalJson = z.infer<typeof CanonicalJson>;

/** `value` with every object's keys sorted. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeys(item));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => (left < right ? -1 : 1))
        .map(([key, item]) => [key, sortKeys(item)]),
    );
  }
  return value;
}

/** `value` as JSON with every object's keys sorted: what content and bundle hashes are taken over. */
export function canonicalJson(value: unknown): CanonicalJson {
  return CanonicalJson.parse(JSON.stringify(sortKeys(value)));
}
