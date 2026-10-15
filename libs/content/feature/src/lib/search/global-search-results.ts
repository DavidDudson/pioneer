import type { ContentEntry, ContentId } from '@pioneer/rules/sdk';

/** Most instant name matches the box lists. */
const NAME_MATCHES_MAX = 20;

/** How well a name matches the typed words; lower is better. */
const Rank = {
  Exact: 0,
  Prefix: 1,
  WordPrefix: 2,
  Contains: 3,
} as const;

/** The rank of `name` for lowercase `words`, or undefined when the name does not contain them. */
function rankOf(name: string, words: string): number | undefined {
  const lower = name.toLowerCase();
  if (lower === words) {
    return Rank.Exact;
  }
  if (lower.startsWith(words)) {
    return Rank.Prefix;
  }
  if (lower.split(/[\s-]+/u).some((part) => part.startsWith(words))) {
    return Rank.WordPrefix;
  }
  return lower.includes(words) ? Rank.Contains : undefined;
}

/**
 * The entries whose name contains `words`, best first: exact, then name starts with, then a word starts with, then
 * contains; ties by name in the UI locale. At most `NAME_MATCHES_MAX`. Blank words match nothing.
 */
export function nameMatches(
  entries: readonly ContentEntry[],
  words: string,
  compare: (left: string, right: string) => number,
): readonly ContentEntry[] {
  const wanted = words.trim().toLowerCase();
  if (wanted === '') {
    return [];
  }
  return entries
    .flatMap((entry) => {
      const rank = rankOf(entry.name, wanted);
      return rank === undefined ? [] : [{ entry, rank }];
    })
    .toSorted((left, right) => left.rank - right.rank || compare(left.entry.name, right.entry.name))
    .slice(0, NAME_MATCHES_MAX)
    .map(({ entry }) => entry);
}

/**
 * `shown` followed by the `incoming` ids it does not hold yet: what the user already sees keeps its place, and
 * anything new goes below it.
 */
export function mergeBelow(shown: readonly ContentId[], incoming: readonly ContentId[]): readonly ContentId[] {
  const held = new Set(shown);
  return [...shown, ...new Set(incoming.filter((id) => !held.has(id)))];
}
