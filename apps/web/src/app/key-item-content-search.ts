import { ReviewedName, ReviewedRuneId } from '@pioneer/campaign/domain';
import type { ContentChoice, KeyItemContentSearch } from '@pioneer/campaign/feature';
import { INVENTORY_KINDS, itemContent, runeContent } from '@pioneer/character/domain';
import { ContentKind, SearchLimit, SearchOffset, SearchText } from '@pioneer/rules/sdk';
import type {
  ContentEntry,
  ContentId,
  ContentRegistry,
  ContentSearchQuery,
  ContentSearchResult,
} from '@pioneer/rules/sdk';
import { SOURCE_LOCALE } from '@pioneer/shared/kernel';

/** How many matches a key item's picker lists. */
const MATCHES_MAX = SearchLimit.parse(20);
const FIRST_PAGE = SearchOffset.parse(0);

/** What the search reads of the content loader, which `ContentLoader` is: the server's search, and the entries by kind. */
export interface ContentFinder {
  readonly search: (query: ContentSearchQuery) => Promise<ContentSearchResult>;
  readonly registry: (kinds: readonly ContentKind[]) => Promise<ContentRegistry>;
}

/** The entries of the kinds the search finds, by id. */
type Entries = ReadonlyMap<ContentId, Pick<ContentEntry, 'name'>>;

/** What a picker searches among: the kinds of entry, and how their entries are read off a registry. */
interface Searched {
  readonly kinds: readonly ContentKind[];
  readonly entriesOf: (registry: ContentRegistry) => Entries;
}

/** The matches for `words` among `searched`, best first, each named as its entry is; none for words that are blank. */
async function find(
  finder: ContentFinder,
  words: string,
  { kinds, entriesOf }: Searched,
): Promise<readonly ContentChoice[]> {
  const text = SearchText.safeParse(words);
  if (!text.success) {
    return [];
  }
  const query: ContentSearchQuery = {
    query: text.data,
    locale: SOURCE_LOCALE,
    kinds: [...kinds],
    packs: [],
    legacy: false,
    limit: MATCHES_MAX,
    offset: FIRST_PAGE,
  };
  const [found, registry] = await Promise.all([finder.search(query), finder.registry(kinds)]);
  const entries = entriesOf(registry);
  return found.ids.flatMap((id): ContentChoice[] => {
    const name = entries.get(id)?.name;
    return name === undefined ? [] : [{ id: ReviewedRuneId.parse(id), name: ReviewedName.parse(name) }];
  });
}

/**
 * The campaign's search for a key item's base item and runes, over the rules content: the server finds the ids, and the
 * bundles the browser already holds name them. A key item's base is any item a character can carry (ADR-0064).
 */
export function keyItemContentSearch(finder: ContentFinder): KeyItemContentSearch {
  return {
    items: async (words) => find(finder, words, { kinds: INVENTORY_KINDS, entriesOf: itemContent }),
    runes: async (words) => find(finder, words, { kinds: [ContentKind.Rune], entriesOf: runeContent }),
  };
}
