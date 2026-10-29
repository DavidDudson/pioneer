import { ContentKind } from '@pioneer/rules/sdk';
import type { AonListedEntry, AonUrl, BookId, EnrichmentMapping, EntrySlug, SourceRef } from '@pioneer/rules/sdk';

/** The AoN page that lists each kind of entry (`Feats.aspx?ID=…`), and so the kinds it can hold. */
const KINDS_BY_PAGE: Readonly<Record<string, readonly ContentKind[]>> = {
  Actions: [ContentKind.Action],
  Ancestries: [ContentKind.Ancestry],
  Archetypes: [ContentKind.Archetype],
  Armor: [ContentKind.Armor],
  Backgrounds: [ContentKind.Background],
  ClassKits: [ContentKind.Kit],
  Classes: [ContentKind.Class],
  Conditions: [ContentKind.Condition],
  Deities: [ContentKind.Deity],
  Equipment: [ContentKind.Equipment, ContentKind.Consumable, ContentKind.Treasure, ContentKind.Rune],
  Feats: [ContentKind.Feat],
  Heritages: [ContentKind.Heritage],
  Languages: [ContentKind.Language],
  MonsterAbilities: [ContentKind.Action],
  Monsters: [ContentKind.Creature],
  NPCs: [ContentKind.Creature],
  Relics: [ContentKind.Equipment, ContentKind.Action],
  Rituals: [ContentKind.Ritual],
  Rules: [ContentKind.VariantRule],
  Shields: [ContentKind.Shield],
  Spells: [ContentKind.Spell],
  Tactics: [ContentKind.Action],
  Traits: [ContentKind.Trait],
  Weapons: [ContentKind.Weapon],
};

/**
 * AoN lists magic weapons, armor and shields (staves, bombs, named items with grades) on its Equipment page, not on
 * Weapons, Armor or Shields, which hold the base items. An entry of these kinds falls back to the Equipment page only
 * when its own page has no match, so a base item is never made ambiguous by an Equipment row of the same name.
 */
const EQUIPMENT_FALLBACK_KINDS: readonly ContentKind[] = [ContentKind.Weapon, ContentKind.Armor, ContentKind.Shield];

/**
 * The other AoN pages a kind falls back to: the Equipment page for items (above), and the Feats page for an action a
 * feat grants, which AoN prints under the feat of the same name.
 */
const FALLBACK_KINDS_BY_PAGE: Readonly<Record<string, readonly ContentKind[]>> = {
  Equipment: EQUIPMENT_FALLBACK_KINDS,
  Feats: [ContentKind.Action],
};
const FALLBACK_KINDS: ReadonlySet<ContentKind> = new Set(Object.values(FALLBACK_KINDS_BY_PAGE).flat());

/**
 * The kinds whose superseded rows were checked against AoN's own flag for a hidden row (`exclude_from_search`): the
 * higher ID was the current one for every creature and feat group. A weapon, armor or shield is left out because the
 * current row is not always the higher ID: Hand Cannon's current row is the higher (NPC Core 523 over Guns & Gears
 * 193), Repeating Crossbow's the lower (Guns & Gears 176 over the Tian Xia Character Guide's 448).
 */
const NEWEST_KINDS: ReadonlySet<ContentKind> = new Set([ContentKind.Creature, ContentKind.Feat]);

/** The kinds some AoN page holds. An entry of any other kind (effects, class features) has no AoN page to find. */
const LISTED_KINDS: ReadonlySet<ContentKind> = new Set(Object.values(KINDS_BY_PAGE).flat());

/** What the matcher reads from an entry. */
export interface AonMatchable {
  readonly slug: EntrySlug;
  readonly kind: ContentKind;
  readonly name: string;
  readonly sources: readonly SourceRef[];
}

/** A book's listing, as stored in `content/aon/<book>.json`. */
export interface AonListing {
  readonly book: BookId;
  readonly entries: readonly AonListedEntry[];
  /** The URLs the book prints a page for (`content/aon/pages/<book>.json`); AoN rows without one are not in the book. */
  readonly printed?: ReadonlySet<AonUrl>;
}

/**
 * What the matcher found: mappings to propose, entries with more than one candidate, entries of a kind AoN has no page
 * for, and entries of a listed kind it found nothing for.
 */
export interface AonProposals {
  readonly proposals: ReadonlyMap<EntrySlug, EnrichmentMapping>;
  readonly ambiguous: readonly EntrySlug[];
  readonly unlisted: number;
  readonly unmatched: readonly EntrySlug[];
}

/** Lowercase words with straight apostrophes and no diacritics: "Warrior’s Regret" finds "Warrior's Regret". */
function normalise(name: string): string {
  return name
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .replaceAll('’', "'")
    .replaceAll(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
}

function pageOf(url: AonUrl): string {
  return new URL(url).pathname.replace(/^\//u, '').replace(/\.aspx$/iu, '');
}

/**
 * "Alchemist's Lab (Expanded)" and "Rope, Silk" also look up "Alchemist's Lab" and "Rope", after the full name, and
 * "Windlass Bola" looks up AoN's plural "Windlass Bolas" last.
 */
function nameVariants(name: string): readonly string[] {
  const withoutParenthetical = name.replace(/\s*\([^)]*\)\s*$/u, '');
  const withoutSuffix = withoutParenthetical.replace(/,.*$/u, '');
  return [...new Set([name, withoutParenthetical, withoutSuffix, `${withoutSuffix}s`])];
}

/** Listing entries by normalised name and the kinds their page holds; the Equipment fallback is keyed apart. */
type ListingIndex = ReadonlyMap<string, readonly AonUrl[]>;

function indexKey(name: string, kind: ContentKind, fallback = false): string {
  return `${kind}\u0000${fallback ? 'equipment\u0000' : ''}${normalise(name)}`;
}

function indexListing({ entries }: AonListing): ListingIndex {
  const index = new Map<string, AonUrl[]>();
  for (const { name, url } of entries) {
    const page = pageOf(url);
    const keys = [
      ...(KINDS_BY_PAGE[page] ?? []).map((kind) => indexKey(name, kind)),
      ...(FALLBACK_KINDS_BY_PAGE[page] ?? []).map((kind) => indexKey(name, kind, true)),
    ];
    for (const key of keys) {
      index.set(key, [...(index.get(key) ?? []), url]);
    }
  }
  return index;
}

/** The first book source that has no AoN link yet, with a listing to look in. */
function openSource(entry: AonMatchable, listings: ReadonlyMap<BookId, ListingIndex>): BookId | undefined {
  for (const source of entry.sources) {
    if (source.kind === 'book' && source.aon === undefined && listings.has(source.book)) {
      return source.book;
    }
  }
  return undefined;
}

/** How one entry fared: a mapping to propose, more than one candidate, no candidate, or not for the matcher. */
type Outcome =
  | { readonly kind: 'proposal'; readonly mapping: EnrichmentMapping }
  | { readonly kind: 'ambiguous' | 'unmatched' | 'unlisted' | 'skipped' };

/** The distinct URLs of the first name variant that the listing holds under `fallback`; rows sharing a URL are one. */
function candidatesIn(index: ListingIndex, entry: AonMatchable, fallback: boolean): readonly AonUrl[] {
  for (const name of nameVariants(entry.name)) {
    const rows = index.get(indexKey(name, entry.kind, fallback));
    const found = rows === undefined ? [] : [...new Set(rows)];
    if (found.length > 0) {
      return found;
    }
  }
  return [];
}

/** The candidates on the entry's own pages, else, for a weapon, armor or shield, on the Equipment page. */
function candidates(index: ListingIndex, entry: AonMatchable): readonly AonUrl[] {
  const own = candidatesIn(index, entry, false);
  return own.length > 0 || !FALLBACK_KINDS.has(entry.kind) ? own : candidatesIn(index, entry, true);
}

/**
 * AoN keeps a row for the legacy and the remastered page of an item, and a book prints only one of them: with more
 * than one candidate, the one URL the book's own page table holds. Several, or none, stay ambiguous.
 */
function printedIn(urls: readonly AonUrl[], printed: ReadonlySet<AonUrl> | undefined): readonly AonUrl[] {
  const inBook = printed === undefined ? [] : urls.filter((url) => printed.has(url));
  return inBook.length === 1 ? inBook : urls;
}

/**
 * AoN supersedes a page by adding a row with a higher ID (checked on Banshee Cry Display and Anadi Elder, and on
 * every creature and feat group in the listings: the old page says "There is a more recent version"). For an entry of
 * a kind it was checked on with several rows of one AoN page still, the highest ID; rows of different pages stay
 * ambiguous. A creature whose name carries a parenthetical ("Gurglegut (Level 12)") is one of several rows that differ
 * by level, not a superseded one, so it stays ambiguous.
 */
function newest(entry: AonMatchable, urls: readonly AonUrl[]): readonly AonUrl[] {
  const pages = new Set(urls.map((url) => pageOf(url)));
  const ids = urls.map((url) => ({ url, id: Number(new URL(url).searchParams.get('ID')) }));
  if (
    urls.length < 2 ||
    pages.size !== 1 ||
    !NEWEST_KINDS.has(entry.kind) ||
    (entry.kind === ContentKind.Creature && entry.name.includes('(')) ||
    ids.some(({ id }) => !Number.isInteger(id))
  ) {
    return urls;
  }
  const [top] = ids.toSorted((left, right) => right.id - left.id);
  return top === undefined ? urls : [top.url];
}

/**
 * For a weapon, armor or shield its cited books' listings lack (a base item AoN lists in the book that remastered it):
 * the one URL every other listing holds for the name. The page, which only the cited book gives, is not proposed.
 */
function elsewhere(entry: AonMatchable, indexes: ReadonlyMap<BookId, ListingIndex>): readonly AonUrl[] {
  if (!EQUIPMENT_FALLBACK_KINDS.includes(entry.kind)) {
    return [];
  }
  const found = [...indexes.values()].flatMap((index) => candidates(index, entry));
  return [...new Set(found)];
}

function matchEntry(
  entry: AonMatchable,
  indexes: ReadonlyMap<BookId, ListingIndex>,
  printed: ReadonlyMap<BookId, ReadonlySet<AonUrl> | undefined>,
): Outcome {
  const book = openSource(entry, indexes);
  if (book === undefined) {
    return { kind: 'skipped' };
  }
  if (!LISTED_KINDS.has(entry.kind)) {
    return { kind: 'unlisted' };
  }
  const index = indexes.get(book);
  const own = index === undefined ? [] : newest(entry, printedIn(candidates(index, entry), printed.get(book)));
  const urls = own.length > 0 ? own : elsewhere(entry, indexes);
  const [url] = urls;
  if (urls.length > 1) {
    return { kind: 'ambiguous' };
  }
  return url === undefined ? { kind: 'unmatched' } : { kind: 'proposal', mapping: { book, aon: url } };
}

/**
 * Proposes the AoN URL of each entry from the books' listings (ADR-0071). An entry matches when a listing of a book it
 * cites holds exactly one URL for an entry of that kind with its name, or with the parenthetical or comma suffix of the
 * name dropped (a weapon, armor or shield not found on its own page is looked up on the Equipment page, where AoN lists
 * the magic ones, and a graded variant maps to the page of its base item); two candidates are reported, not guessed. An entry that
 * already has a mapping, or whose source already has a link, is left alone. A page number is never proposed: it comes
 * from the book.
 */
export function proposeAonMappings(
  entries: readonly AonMatchable[],
  listings: readonly AonListing[],
  mapped: ReadonlySet<EntrySlug>,
): AonProposals {
  const indexes = new Map(listings.map((listing) => [listing.book, indexListing(listing)]));
  const printed = new Map(listings.map((listing) => [listing.book, listing.printed]));
  const results = entries
    .filter(({ slug }) => !mapped.has(slug))
    .map((entry) => ({ entry, outcome: matchEntry(entry, indexes, printed) }));
  const slugsOf = (kind: Outcome['kind']): readonly EntrySlug[] =>
    results.filter(({ outcome }) => outcome.kind === kind).map(({ entry }) => entry.slug);
  const proposals = new Map(
    results.flatMap(({ entry, outcome }): [EntrySlug, EnrichmentMapping][] =>
      outcome.kind === 'proposal' ? [[entry.slug, outcome.mapping]] : [],
    ),
  );
  return {
    proposals,
    ambiguous: slugsOf('ambiguous'),
    unlisted: slugsOf('unlisted').length,
    unmatched: slugsOf('unmatched'),
  };
}
