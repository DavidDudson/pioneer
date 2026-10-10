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

/**
 * How the seed turns a pack into rows. Bump it when that changes (a new column, a new mapping) so every stored hash
 * stops matching and the next seed rewrites every pack.
 */
const SEED_FORMAT = 1;

/**
 * SHA-256, as hex, of a pack's canonical JSON: its `pack.json` and its entries sorted by id, so reordering a file
 * changes nothing, plus the seed format.
 */
export function contentHash({ file, entries }: PackContents): string {
  const sorted = entries.toSorted((left, right) => (left.id < right.id ? -1 : 1));
  const canonicalJson = JSON.stringify(canonical({ format: SEED_FORMAT, file, entries: sorted }));
  return new Bun.CryptoHasher('sha256').update(canonicalJson).digest('hex');
}
