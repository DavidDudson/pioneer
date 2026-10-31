/** The Runic block's letters, as the first and last letter of each run; U+16EB to U+16F0 are punctuation and golden-number marks. */
const LETTER_RUNS: readonly (readonly [string, string])[] = [
  ['ᚠ', 'ᛪ'],
  ['ᛱ', 'ᛸ'],
];

function range([first, last]: readonly [string, string]): readonly string[] {
  const start = first.codePointAt(0) ?? 0;
  const end = last.codePointAt(0) ?? 0;
  return Array.from({ length: end - start + 1 }, (_unused, offset) => String.fromCodePoint(start + offset));
}

/** The 83 letters of the Runic block, in code point order. Never the punctuation or golden-number code points. */
export const RUNIC_LETTERS: readonly string[] = LETTER_RUNS.flatMap((run) => range(run));

/** A polynomial hash over 32 bits: stable between builds and engines, and small enough that no step leaves the safe integers. */
const HASH_BITS = 32;
const HASH_MODULUS = 2 ** HASH_BITS;
const HASH_MULTIPLIER = 65_599;
/**
 * Where the hash starts. 119 runes into 6,889 pairs usually collide (the birthday bound), so the seed is the first
 * one under which no two loaded property runes share a pair. The catalog test fails when a book adds a collision;
 * the fix is a new seed.
 */
const PAIR_SEED = 4;

/** A stable 32-bit hash of `text`. */
function stableHash(text: string): number {
  return text
    .split('')
    .reduce((hash, letter) => (hash * HASH_MULTIPLIER + (letter.codePointAt(0) ?? 0)) % HASH_MODULUS, PAIR_SEED);
}

/**
 * A pair of Runic letters picked by `text`: a pure function of it, so the same text shows the same pair on every
 * sheet and visit. 83 letters give 6,889 pairs.
 */
export function runicPair(text: string): string {
  const hash = stableHash(text);
  const count = RUNIC_LETTERS.length;
  const first = hash % count;
  const second = Math.floor(hash / count) % count;
  return `${RUNIC_LETTERS[first] ?? ''}${RUNIC_LETTERS[second] ?? ''}`;
}
