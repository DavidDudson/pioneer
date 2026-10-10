import type { PackContents } from '@pioneer/rules/sdk';

/** JSON with every object's keys sorted, so equal values serialise to equal text whatever order the files wrote. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonical(item));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => (left < right ? -1 : 1))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}

/** SHA-256, as hex, of a pack's canonical JSON: its `pack.json` and its entries in file order. */
export function contentHash(contents: PackContents): string {
  return new Bun.CryptoHasher('sha256').update(JSON.stringify(canonical(contents))).digest('hex');
}
