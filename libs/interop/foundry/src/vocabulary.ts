import { ContentId, contentId, ContentKind, ContentText, EntrySlug, SourceKind } from '@pioneer/rules/sdk';
import type { BookId } from '@pioneer/rules/sdk';

import type { KnownEntry } from './entry-references';
import { langLabel } from './foundry-config';
import type { EnvelopeFields } from './imported-envelope';
import type { SelectedEntry } from './select-entries';
import type { ImportedKindData } from './translate-kind-data';
import {
  damageTypeItem,
  firstUses,
  knownSlugs,
  languageItem,
  languagesOf,
  loreItem,
  loreNames,
  loresOf,
  senseItem,
  sensesOf,
  traitItems,
  VocabularyGapReason,
} from './vocabulary-items';
import type { Gap, Item, VocabularyContext } from './vocabulary-items';

/**
 * Entries for the vocabularies Foundry keeps in config rather than packs: traits, languages, senses and damage types
 * (content-model.md, "Foundry import"), and the statistic of each Lore a background trains, which Foundry keeps
 * nowhere. Only what the selected documents use is imported, cited to the book of the
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

function entryOf(item: Item, { pack, lang }: VocabularyContext): VocabularyEntry | VocabularyGap {
  const { kind, slug: foundrySlug, label: itemLabel, rarity, book, kindData } = item;
  const label = 'text' in itemLabel ? itemLabel.text : langLabel(lang, itemLabel.key);
  if (label === undefined) {
    const detail = 'key' in itemLabel ? itemLabel.key : itemLabel.text;
    return { kind, slug: foundrySlug, reason: VocabularyGapReason.MissingLabel, detail };
  }
  const slugText = `${kind}:${foundrySlug}`;
  const slug = EntrySlug.safeParse(slugText);
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

function entries(items: readonly Item[], context: VocabularyContext): Vocabulary {
  const built = items.map((item) => entryOf(item, context));
  return {
    entries: built.filter((each): each is VocabularyEntry => 'envelope' in each),
    gaps: built.filter((each): each is VocabularyGap => 'reason' in each),
  };
}

function otherUses(selected: readonly SelectedEntry[], { config, books }: VocabularyContext): Uses[] {
  const [firstBook] = books;
  const lores = loreNames(selected);
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
      kind: ContentKind.Statistic,
      uses: firstUses(selected, (entry) => loresOf(entry).map(({ slug }) => slug)),
      itemOf: (slug: string, book: BookId): Item | Gap => loreItem(slug, lores, book),
    },
    {
      kind: ContentKind.DamageType,
      uses: new Map(firstBook === undefined ? [] : config.damageTypes.map((slug) => [slug, firstBook])),
      itemOf: damageTypeItem,
    },
  ];
}

/**
 * The trait, language, sense, Lore statistic and damage type entries the selected documents use, in the vocabulary
 * pack, each slug its kind and Foundry's slug (`trait:goblin`, `language:goblin`, `statistic:scribing-lore`). What another official pack already has, an
 * earlier run's vocabulary included, is left to that entry.
 */
export function importVocabulary(selected: readonly SelectedEntry[], context: VocabularyContext): Vocabulary {
  const others = otherUses(selected, context).map((uses) => collect(uses, context.known));
  const built = entries([...traitItems(selected, context), ...others.flatMap(({ items }) => items)], context);
  return { entries: built.entries, gaps: [...others.flatMap(({ gaps }) => gaps), ...built.gaps] };
}
