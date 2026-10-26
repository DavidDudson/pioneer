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
  Monsters: [ContentKind.Creature],
  NPCs: [ContentKind.Creature],
  Relics: [ContentKind.Equipment],
  Rituals: [ContentKind.Ritual],
  Rules: [ContentKind.VariantRule],
  Shields: [ContentKind.Shield],
  Spells: [ContentKind.Spell],
  Traits: [ContentKind.Trait],
  Weapons: [ContentKind.Weapon],
};

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

/** "Alchemist's Lab (Expanded)" and "Rope, Silk" also look up "Alchemist's Lab" and "Rope", after the full name. */
function nameVariants(name: string): readonly string[] {
  const withoutParenthetical = name.replace(/\s*\([^)]*\)\s*$/u, '');
  const withoutSuffix = withoutParenthetical.replace(/,.*$/u, '');
  return [...new Set([name, withoutParenthetical, withoutSuffix])];
}

/** Listing entries by normalised name and the kinds their page holds. */
type ListingIndex = ReadonlyMap<string, readonly AonUrl[]>;

function indexKey(name: string, kind: ContentKind): string {
  return `${kind}\u0000${normalise(name)}`;
}

function indexListing({ entries }: AonListing): ListingIndex {
  const index = new Map<string, AonUrl[]>();
  for (const { name, url } of entries) {
    for (const kind of KINDS_BY_PAGE[pageOf(url)] ?? []) {
      const key = indexKey(name, kind);
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

/** The distinct URLs of the first name variant that the listing holds; rows sharing a URL are one candidate. */
function candidates(index: ListingIndex, entry: AonMatchable): readonly AonUrl[] {
  for (const name of nameVariants(entry.name)) {
    const rows = index.get(indexKey(name, entry.kind));
    const found = rows === undefined ? [] : [...new Set(rows)];
    if (found.length > 0) {
      return found;
    }
  }
  return [];
}

function matchEntry(entry: AonMatchable, indexes: ReadonlyMap<BookId, ListingIndex>): Outcome {
  const book = openSource(entry, indexes);
  if (book === undefined) {
    return { kind: 'skipped' };
  }
  if (!LISTED_KINDS.has(entry.kind)) {
    return { kind: 'unlisted' };
  }
  const index = indexes.get(book);
  const urls = index === undefined ? [] : candidates(index, entry);
  const [url] = urls;
  if (urls.length > 1) {
    return { kind: 'ambiguous' };
  }
  return url === undefined ? { kind: 'unmatched' } : { kind: 'proposal', mapping: { book, aon: url } };
}

/**
 * Proposes the AoN URL of each entry from the books' listings (ADR-0071). An entry matches when a listing of a book it
 * cites holds exactly one URL for an entry of that kind with its name, or with the parenthetical or comma suffix of the
 * name dropped; two candidates are reported, not guessed. An entry that
 * already has a mapping, or whose source already has a link, is left alone. A page number is never proposed: it comes
 * from the book.
 */
export function proposeAonMappings(
  entries: readonly AonMatchable[],
  listings: readonly AonListing[],
  mapped: ReadonlySet<EntrySlug>,
): AonProposals {
  const indexes = new Map(listings.map((listing) => [listing.book, indexListing(listing)]));
  const results = entries
    .filter(({ slug }) => !mapped.has(slug))
    .map((entry) => ({ entry, outcome: matchEntry(entry, indexes) }));
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
