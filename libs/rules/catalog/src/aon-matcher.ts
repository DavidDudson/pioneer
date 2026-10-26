import { ContentKind } from '@pioneer/rules/sdk';
import type { AonListedEntry, AonUrl, BookId, EnrichmentMapping, EntrySlug, SourceRef } from '@pioneer/rules/sdk';

/** The AoN page that lists each kind of entry (`Feats.aspx?ID=…`), and so the kinds it can hold. */
const KINDS_BY_PAGE: Readonly<Record<string, readonly ContentKind[]>> = {
  Actions: [ContentKind.Action],
  Ancestries: [ContentKind.Ancestry],
  Archetypes: [ContentKind.Archetype],
  Armor: [ContentKind.Armor],
  Backgrounds: [ContentKind.Background],
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

/** What the matcher found: mappings to propose, entries with more than one candidate, and the count it left. */
export interface AonProposals {
  readonly proposals: ReadonlyMap<EntrySlug, EnrichmentMapping>;
  readonly ambiguous: readonly EntrySlug[];
  readonly unmatched: number;
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
  | { readonly kind: 'ambiguous' | 'unmatched' | 'skipped' };

function matchEntry(entry: AonMatchable, indexes: ReadonlyMap<BookId, ListingIndex>): Outcome {
  const book = openSource(entry, indexes);
  if (book === undefined) {
    return { kind: 'skipped' };
  }
  const urls = indexes.get(book)?.get(indexKey(entry.name, entry.kind)) ?? [];
  const [url] = urls;
  if (urls.length > 1) {
    return { kind: 'ambiguous' };
  }
  return url === undefined ? { kind: 'unmatched' } : { kind: 'proposal', mapping: { book, aon: url } };
}

/**
 * Proposes the AoN URL of each entry from the books' listings (ADR-0071). An entry matches when a listing of a book it
 * cites holds exactly one entry of that kind with its name; two candidates are reported, not guessed. An entry that
 * already has a mapping, or whose source already has a link, is left alone. A page number is never proposed: it comes
 * from the book.
 */
export function proposeAonMappings(
  entries: readonly AonMatchable[],
  listings: readonly AonListing[],
  mapped: ReadonlySet<EntrySlug>,
): AonProposals {
  const indexes = new Map(listings.map((listing) => [listing.book, indexListing(listing)]));
  const proposals = new Map<EntrySlug, EnrichmentMapping>();
  const ambiguous: EntrySlug[] = [];
  let unmatched = 0;
  for (const entry of entries.filter(({ slug }) => !mapped.has(slug))) {
    const outcome = matchEntry(entry, indexes);
    if (outcome.kind === 'proposal') {
      proposals.set(entry.slug, outcome.mapping);
    } else if (outcome.kind === 'ambiguous') {
      ambiguous.push(entry.slug);
    } else if (outcome.kind === 'unmatched') {
      unmatched += 1;
    }
  }
  return { proposals, ambiguous, unmatched };
}
