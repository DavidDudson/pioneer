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

/** An item and the slug it gets in the vocabulary pack. */
interface Slugged {
  readonly item: Item;
  readonly slug: string;
}

interface Claimed {
  readonly slugged: readonly Slugged[];
  readonly gaps: readonly VocabularyGap[];
}

function slugTaken({ kind, slug }: Item): VocabularyGap {
  return { kind, slug, reason: VocabularyGapReason.SlugTaken, detail: slug };
}

/**
 * Each item's slug, claimed in `taken`: its own, or for a kind other than trait, with its kind as a suffix when an
 * entry of the pack already has it. A trait is named by its slug, so a taken one is a gap, as is a suffixed slug
 * that is taken too.
 */
function claim(items: readonly Item[], taken: Set<string>): Claimed {
  const slugged: Slugged[] = [];
  const gaps: VocabularyGap[] = [];
  for (const item of items) {
    const own = taken.has(item.slug) ? undefined : item.slug;
    const suffixed = item.kind === ContentKind.Trait ? undefined : `${item.slug}-${item.kind}`;
    const slug = own ?? (suffixed !== undefined && !taken.has(suffixed) ? suffixed : undefined);
    if (slug === undefined) {
      gaps.push(slugTaken(item));
    } else {
      taken.add(slug);
      slugged.push({ item, slug });
    }
  }
  return { slugged, gaps };
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

function entries(slugged: readonly Slugged[], context: VocabularyContext): Vocabulary {
  const built = slugged.map(({ item, slug }) => entryOf(item, slug, context));
  return {
    entries: built.filter((each): each is VocabularyEntry => 'envelope' in each),
    gaps: built.filter((each): each is VocabularyGap => 'reason' in each),
  };
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
 * already has gets its kind as a suffix (`fire-damage-type`). What another official pack already has, an earlier
 * run's vocabulary included, is left to that entry.
 */
export function importVocabulary(selected: readonly SelectedEntry[], context: VocabularyContext): Vocabulary {
  const { pack, known } = context;
  const taken = new Set(known.filter((entry) => entry.pack === pack).map(({ slug }) => slug));
  const others = otherUses(selected, context).map((uses) => collect(uses, known));
  // Traits first: their slugs are what entries name them by.
  const claimed = claim([...traitItems(selected, context), ...others.flatMap(({ items }) => items)], taken);
  const built = entries(claimed.slugged, context);
  return { entries: built.entries, gaps: [...claimed.gaps, ...others.flatMap(({ gaps }) => gaps), ...built.gaps] };
}
