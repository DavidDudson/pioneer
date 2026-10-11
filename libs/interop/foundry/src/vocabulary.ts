import { ContentId, contentId, ContentKind, ContentText, Slug, SourceKind } from '@pioneer/rules/sdk';
import type { BookId } from '@pioneer/rules/sdk';

import type { KnownEntry } from './entry-references';
import { langLabel } from './foundry-config';
import type { SelectedEntry } from './select-entries';
import type { EnvelopeFields } from './translate-envelope';
import type { ImportedKindData } from './translate-kind-data';
import {
  damageTypeItem,
  firstUses,
  knownSlugs,
  languageItem,
  languagesOf,
  senseItem,
  sensesOf,
  traitItems,
  VocabularyGapReason,
} from './vocabulary-items';
import type { Gap, Item, VocabularyContext } from './vocabulary-items';

/**
 * Entries for the vocabularies Foundry keeps in config rather than packs: traits, languages, senses and damage types
 * (content-model.md, "Foundry import"). Only what the selected documents use is imported, cited to the book of the
 * first document that uses it; a slug another official pack already has (a hand-authored `core-rules` language) is
 * left to that entry. Damage types are all imported, as Pioneer's `DamageType` set, cited to the first target book.
 */

export interface VocabularyEntry {
  readonly envelope: EnvelopeFields;
  readonly kindData: ImportedKindData;
}

export interface VocabularyGap {
  readonly kind: ContentKind;
  readonly slug: string;
  readonly reason: VocabularyGapReason;
  readonly detail: string;
}

export interface Vocabulary {
  readonly entries: readonly VocabularyEntry[];
  readonly gaps: readonly VocabularyGap[];
}

function isGap(value: Item | Gap): value is Gap {
  return 'reason' in value;
}

interface Collected {
  readonly items: Item[];
  readonly gaps: VocabularyGap[];
}

interface Uses {
  readonly kind: ContentKind;
  /** Each value used, with the book to cite. */
  readonly uses: ReadonlyMap<string, BookId>;
  readonly itemOf: (slug: string, book: BookId) => Item | Gap;
}

function collect({ kind, uses, itemOf }: Uses, known: readonly KnownEntry[]): Collected {
  const skip = knownSlugs(known, kind);
  const items: Item[] = [];
  const gaps: VocabularyGap[] = [];
  for (const [slug, book] of uses) {
    const item = skip.has(slug) ? undefined : itemOf(slug, book);
    if (item !== undefined && isGap(item)) {
      gaps.push({ kind, slug, ...item });
    } else if (item !== undefined) {
      items.push(item);
    }
  }
  return { items, gaps };
}

/** The slug an item gets: its own, or with its kind as a suffix when an entry of the pack already has it. */
function freeSlug(slug: string, kind: ContentKind, taken: Set<string>): string {
  const free = taken.has(slug) ? `${slug}-${kind}` : slug;
  taken.add(free);
  return free;
}

function entryOf(item: Item, slugText: string, { pack, lang }: VocabularyContext): VocabularyEntry | VocabularyGap {
  const { kind, slug: foundrySlug, labelKey, rarity, book, kindData } = item;
  const label = langLabel(lang, labelKey);
  if (label === undefined) {
    return { kind, slug: foundrySlug, reason: VocabularyGapReason.MissingLabel, detail: labelKey };
  }
  const slug = Slug.safeParse(slugText);
  const name = ContentText.safeParse(label);
  if (!slug.success || !name.success) {
    return { kind, slug: foundrySlug, reason: VocabularyGapReason.Invalid, detail: slug.success ? label : slugText };
  }
  const envelope: EnvelopeFields = {
    id: ContentId.parse(contentId(pack, slug.data)),
    pack,
    slug: slug.data,
    name: name.data,
    rarity,
    traits: [],
    sources: [{ kind: SourceKind.Book, book }],
    description: [],
    rules: [],
  };
  return { envelope, kindData };
}

function entries(items: readonly Item[], slugOf: (item: Item) => string, context: VocabularyContext): Vocabulary {
  const built = items.map((item) => entryOf(item, slugOf(item), context));
  return {
    entries: built.filter((each): each is VocabularyEntry => 'envelope' in each),
    gaps: built.filter((each): each is VocabularyGap => 'reason' in each),
  };
}

/** Trait items whose slug is free, claiming it; a trait is named by its slug, so a taken one is a gap. */
function claimTraits(items: readonly Item[], taken: Set<string>): Collected {
  const free = items.filter(({ slug }) => !taken.has(slug));
  for (const { slug } of free) {
    taken.add(slug);
  }
  const gaps = items
    .filter((item) => !free.includes(item))
    .map(({ kind, slug }) => ({ kind, slug, reason: VocabularyGapReason.SlugTaken, detail: slug }));
  return { items: free, gaps };
}

function otherUses(selected: readonly SelectedEntry[], { config, books }: VocabularyContext): Uses[] {
  const [firstBook] = books;
  return [
    {
      kind: ContentKind.Language,
      uses: firstUses(selected, languagesOf),
      itemOf: (slug: string, book: BookId): Item | Gap => languageItem(slug, book, config),
    },
    {
      kind: ContentKind.Sense,
      uses: firstUses(selected, sensesOf),
      itemOf: (slug: string, book: BookId): Item | Gap => senseItem(slug, book, config),
    },
    {
      kind: ContentKind.DamageType,
      uses: new Map(firstBook === undefined ? [] : config.damageTypes.map((slug) => [slug, firstBook])),
      itemOf: damageTypeItem,
    },
  ];
}

/**
 * The trait, language, sense and damage type entries the selected documents use, in the vocabulary pack. Traits
 * claim their slugs first, since entries name traits by slug; a language, sense or damage type whose slug the pack
 * already has gets its kind as a suffix (`fire-damage-type`).
 */
export function importVocabulary(selected: readonly SelectedEntry[], context: VocabularyContext): Vocabulary {
  const { pack, known } = context;
  const taken = new Set(known.filter((entry) => entry.pack === pack).map(({ slug }) => slug));
  const traits = claimTraits(traitItems(selected, context), taken);
  const others = otherUses(selected, context).map((uses) => collect(uses, known));
  const built = entries(
    [...traits.items, ...others.flatMap(({ items }) => items)],
    ({ slug, kind }) => (kind === ContentKind.Trait ? slug : freeSlug(slug, kind, taken)),
    context,
  );
  return { entries: built.entries, gaps: [...traits.gaps, ...others.flatMap(({ gaps }) => gaps), ...built.gaps] };
}
