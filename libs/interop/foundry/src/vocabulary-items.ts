import { ContentKind, DamageType, Rarity } from '@pioneer/rules/sdk';
import type { BookId, PackId } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { KnownEntry } from './entry-references';
import { bactrian, FoundryLanguageRarity, TRAIT_LIST_KINDS } from './foundry-config';
import type { FoundryConfig, TraitList } from './foundry-config';
import { FoundryItemType } from './foundry-document';
import type { FoundryLang } from './foundry-release';
import type { SelectedEntry } from './select-entries';
import type { ImportedKindData } from './translate-kind-data';

/** The vocabulary items the selected documents use, before they have slugs: what `vocabulary.ts` builds entries of. */

export interface VocabularyContext {
  /** The pack vocabulary entries go into: `core-rules`, beside the hand-authored rules core entries. */
  readonly pack: PackId;
  /** The run's target books, in the order given. */
  readonly books: readonly BookId[];
  readonly config: FoundryConfig;
  readonly lang: FoundryLang;
  /** The other official packs' entries. */
  readonly known: readonly KnownEntry[];
}

export const VocabularyGapReason = {
  /** The lang table has no text for the label key. */
  MissingLabel: 'missing-label',
  /** A language or sense the selected documents use that Foundry's config does not define. */
  UnknownValue: 'unknown-value',
  /** A value with no Pioneer counterpart: a secret language's rarity, the `untyped` damage type. */
  UnmappedValue: 'unmapped-value',
  /** Not a Pioneer slug or entry name. */
  Invalid: 'invalid',
  /** A trait whose slug an entry of another kind in the pack already has; a trait cannot take a suffix. */
  SlugTaken: 'slug-taken',
} as const;
export type VocabularyGapReason = ValueOf<typeof VocabularyGapReason>;

export interface Gap {
  readonly reason: VocabularyGapReason;
  readonly detail: string;
}

/** A vocabulary item before it has a slug: what its envelope and data need. */
export interface Item {
  readonly kind: ContentKind;
  readonly slug: string;
  readonly labelKey: string;
  readonly rarity: Rarity;
  readonly book: BookId;
  readonly kindData: ImportedKindData;
}

const LANGUAGE_RARITIES: Readonly<Partial<Record<FoundryLanguageRarity, Rarity>>> = {
  [FoundryLanguageRarity.Common]: Rarity.Common,
  [FoundryLanguageRarity.Uncommon]: Rarity.Uncommon,
  [FoundryLanguageRarity.Rare]: Rarity.Rare,
};

/** Ancestry and heritage `vision` that is no sense. */
const NORMAL_VISION = 'normal';
const SENSE_RULE = 'Sense';
const LIST_MAX = 100;
const VALUE_MAX = 64;

const Values = z.array(z.string().max(VALUE_MAX)).max(LIST_MAX);
const LanguageFields = z.looseObject({
  languages: z.looseObject({ value: Values.default([]) }).optional(),
  additionalLanguages: z.looseObject({ value: Values.default([]) }).optional(),
});
const VisionField = z.looseObject({ vision: z.string().max(VALUE_MAX).optional() });
const SenseRule = z.looseObject({ key: z.literal(SENSE_RULE), selector: z.string().max(VALUE_MAX) });

const DAMAGE_TYPES: ReadonlySet<string> = new Set(Object.values(DamageType));

/** Each value with the book of the first selected document using it, in selection order. */
export function firstUses(
  selected: readonly SelectedEntry[],
  valuesOf: (entry: SelectedEntry) => readonly string[],
): ReadonlyMap<string, BookId> {
  const uses = new Map<string, BookId>();
  for (const entry of selected) {
    for (const value of valuesOf(entry)) {
      if (!uses.has(value)) {
        uses.set(value, entry.book);
      }
    }
  }
  return uses;
}

/**
 * The Foundry slugs another official pack already has an entry of a kind for: its slug, or its slug less the kind
 * suffix an earlier import gave it (`fire-damage-type` is `fire`), so a re-run never imports one twice.
 */
export function knownSlugs(known: readonly KnownEntry[], kind: ContentKind): ReadonlySet<string> {
  const suffix = `-${kind}`;
  return new Set(
    known
      .filter((entry) => entry.kind === kind)
      .flatMap(({ slug }) => (slug.endsWith(suffix) ? [slug, slug.slice(0, -suffix.length)] : [slug])),
  );
}

export function traitItems(selected: readonly SelectedEntry[], { config, known }: VocabularyContext): Item[] {
  const skip = knownSlugs(known, ContentKind.Trait);
  const uses = firstUses(selected, ({ document }) => document.system.traits?.value ?? []);
  const lists = [...config.traitLists];
  return [...uses].flatMap(([slug, book]) => {
    const holding = lists.filter(([, labels]) => labels.has(slug));
    const [first] = holding;
    if (first === undefined || skip.has(slug)) {
      return [];
    }
    const kinds = new Set(holding.flatMap(([list]: readonly [TraitList, unknown]) => TRAIT_LIST_KINDS[list]));
    const appliesTo = Object.values(ContentKind).filter((kind) => kinds.has(kind));
    return [
      {
        kind: ContentKind.Trait,
        slug,
        labelKey: first[1].get(slug) ?? '',
        rarity: Rarity.Common,
        book,
        kindData: { kind: ContentKind.Trait, data: { appliesTo } },
      },
    ];
  });
}

export function languagesOf({ type, document }: SelectedEntry): readonly string[] {
  if (type !== FoundryItemType.Ancestry) {
    return [];
  }
  const fields = LanguageFields.safeParse(document.system);
  return fields.success
    ? [...(fields.data.languages?.value ?? []), ...(fields.data.additionalLanguages?.value ?? [])]
    : [];
}

export function sensesOf({ type, document }: SelectedEntry): readonly string[] {
  const vision = VisionField.safeParse(document.system);
  const fromVision =
    (type === FoundryItemType.Ancestry || type === FoundryItemType.Heritage) &&
    vision.success &&
    vision.data.vision !== undefined &&
    vision.data.vision !== NORMAL_VISION
      ? [vision.data.vision]
      : [];
  const fromRules = document.system.rules.flatMap((rule) => {
    const sense = SenseRule.safeParse(rule);
    return sense.success ? [sense.data.selector] : [];
  });
  return [...fromVision, ...fromRules];
}

export function languageItem(slug: string, book: BookId, config: FoundryConfig): Item | Gap {
  const foundryRarity = config.languages.get(slug);
  if (foundryRarity === undefined) {
    return { reason: VocabularyGapReason.UnknownValue, detail: slug };
  }
  const rarity = LANGUAGE_RARITIES[foundryRarity];
  if (rarity === undefined) {
    return { reason: VocabularyGapReason.UnmappedValue, detail: foundryRarity };
  }
  return {
    kind: ContentKind.Language,
    slug,
    labelKey: `PF2E.Actor.Creature.Language.${slug}`,
    rarity,
    book,
    kindData: { kind: ContentKind.Language, data: {} },
  };
}

export function senseItem(slug: string, book: BookId, config: FoundryConfig): Item | Gap {
  const sense = config.senses.get(slug);
  if (sense === undefined) {
    return { reason: VocabularyGapReason.UnknownValue, detail: slug };
  }
  const data = {
    ...(sense.acuity === undefined ? {} : { acuity: sense.acuity }),
    ...(sense.unlimitedRange ? { unlimitedRange: true } : {}),
  };
  return {
    kind: ContentKind.Sense,
    slug,
    labelKey: `PF2E.Actor.Creature.Sense.Type.${bactrian(slug)}`,
    rarity: Rarity.Common,
    book,
    kindData: { kind: ContentKind.Sense, data },
  };
}

export function damageTypeItem(slug: string, book: BookId): Item | Gap {
  if (!DAMAGE_TYPES.has(slug)) {
    return { reason: VocabularyGapReason.UnmappedValue, detail: slug };
  }
  return {
    kind: ContentKind.DamageType,
    slug,
    labelKey: `PF2E.Trait${bactrian(slug)}`,
    rarity: Rarity.Common,
    book,
    kindData: { kind: ContentKind.DamageType, data: {} },
  };
}
