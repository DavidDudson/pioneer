import { canonicalJson } from '@pioneer/rules/sdk';
import type { PackContents } from '@pioneer/rules/sdk';

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
  return new Bun.CryptoHasher('sha256')
    .update(canonicalJson({ format: SEED_FORMAT, file, entries: sorted }))
    .digest('hex');
}
