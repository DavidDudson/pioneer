import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { ContentEntry } from './content-entry';
import { Slug } from './content-id';
import type { ContentKind } from './content-kind';
import { Rarity } from './entry-fields';

/**
 * How a facet narrows a list (content-model.md, "Filters"): `set` picks values (OR within, exclusions allowed),
 * `range` bounds a number from below and above, and `flag` is a yes or no.
 */
export const FacetType = { Set: 'set', Range: 'range', Flag: 'flag' } as const;
export type FacetType = ValueOf<typeof FacetType>;

/** A facet's id, which is also its name in the URL: `level`, `traits`. */
export const FacetId = Slug.brand<'FacetId'>();
export type FacetId = z.infer<typeof FacetId>;

/** The value an entry gives a facet when the field the facet reads is missing. Not a slug, so it can't clash. */
const UNKNOWN_VALUE = '_unknown';

/** A whole number, possibly negative: a creature's level is -1. */
const INTEGER = /^-?\d+$/u;
/** A slug (content-id.ts), an integer, or the unknown value. */
const FACET_VALUE = /^(?:_unknown|-?\d+|[a-z\d](?:[a-z\d]|-(?=[a-z\d]))*)$/u;

/**
 * One value of a facet as it appears in counts and the URL: a slug (`fire`, `uncommon`), a whole number for a
 * range facet, `yes` or `no` for a flag, or `_unknown`.
 */
export const FacetValue = z.string().regex(FACET_VALUE).brand<'FacetValue'>();
export type FacetValue = z.infer<typeof FacetValue>;

/** A bound of a range facet's selection, inclusive. */
export const RangeBound = z.int().brand<'RangeBound'>();
export type RangeBound = z.infer<typeof RangeBound>;

/**
 * A range facet's values per unit shown: bulk counts tenths, so its scale is 10 and a value of 10 is 1 Bulk. Display
 * only: URL bounds stay in the stored unit (`f.bulk=..10` is up to 1 Bulk).
 */
export const RangeScale = z.int().positive().brand<'RangeScale'>();
export type RangeScale = z.infer<typeof RangeScale>;

export const FlagValue = { Yes: 'yes', No: 'no' } as const;
export type FlagValue = ValueOf<typeof FlagValue>;

/** A message key for a facet or one of its values, in this lib's `i18n/en.json` under `rules.facet.*`. */
export const FacetLabel = z.string().brand<'FacetLabel'>();
export type FacetLabel = z.infer<typeof FacetLabel>;

/** Where a facet reads its values: property names from the entry down. An array on the way is read element-wise. */
export type FacetPath = readonly PropertyKey[];

/**
 * Reads what a field path can't: the leaves an entry gives a facet, computed (a range band from a range in feet).
 * `undefined` among them marks a missing field, as a path would; an entry of a kind the facet isn't about gives none.
 */
export type FacetDerive = (entry: ContentEntry) => readonly unknown[];

interface FacetBase {
  readonly id: FacetId;
  readonly type: FacetType;
  readonly label: FacetLabel;
  readonly values?: ReadonlyMap<FacetValue, FacetLabel>;
  /**
   * The kinds a facet reads when it reads only some of the kinds it is listed for (weapon group among the
   * equipment kinds), so a UI can hide it unless the list holds one of them. Absent, it reads them all.
   */
  readonly appliesTo?: readonly ContentKind[];
  /** How many of a range facet's values make one of the unit it is shown in; absent is 1. */
  readonly scale?: RangeScale;
}

/**
 * A facet as data: adding one is a definition, not a UI change. It reads a field `path`, or `derive`s its values. A
 * `set` facet whose values are a closed list names them with their labels; one whose values come from content
 * (traits, books) leaves `values` out.
 */
export type FacetDefinition =
  | (FacetBase & { readonly path: FacetPath; readonly derive?: undefined })
  | (FacetBase & { readonly derive: FacetDerive; readonly path?: undefined });

export const FacetMessage = {
  Level: FacetLabel.parse('rules.facet.label.level'),
  Rarity: FacetLabel.parse('rules.facet.label.rarity'),
  Traits: FacetLabel.parse('rules.facet.label.traits'),
  Book: FacetLabel.parse('rules.facet.label.book'),
  Pack: FacetLabel.parse('rules.facet.label.pack'),
  Unknown: FacetLabel.parse('rules.facet.unknown'),
  Yes: FacetLabel.parse('rules.facet.yes'),
  No: FacetLabel.parse('rules.facet.no'),
} as const;

/** Labels for a closed set, from its values and the message key of each. */
export function facetLabels(keys: Readonly<Record<string, string>>): ReadonlyMap<FacetValue, FacetLabel> {
  return new Map(Object.entries(keys).map(([value, key]) => [FacetValue.parse(value), FacetLabel.parse(key)]));
}

const RARITY_LABELS: ReadonlyMap<FacetValue, FacetLabel> = new Map([
  [FacetValue.parse(Rarity.Common), FacetLabel.parse('rules.facet.rarity.common')],
  [FacetValue.parse(Rarity.Uncommon), FacetLabel.parse('rules.facet.rarity.uncommon')],
  [FacetValue.parse(Rarity.Rare), FacetLabel.parse('rules.facet.rarity.rare')],
  [FacetValue.parse(Rarity.Unique), FacetLabel.parse('rules.facet.rarity.unique')],
]);

export const UNKNOWN = FacetValue.parse(UNKNOWN_VALUE);
const YES = FacetValue.parse(FlagValue.Yes);
const NO = FacetValue.parse(FlagValue.No);

/** Labels of the values every flag facet has. */
export const FLAG_LABELS: ReadonlyMap<FacetValue, FacetLabel> = new Map([
  [YES, FacetMessage.Yes],
  [NO, FacetMessage.No],
]);

/** Facets every kind has, from the envelope. */
export const COMMON_FACETS: readonly FacetDefinition[] = [
  { id: FacetId.parse('level'), type: FacetType.Range, path: ['level'], label: FacetMessage.Level },
  {
    id: FacetId.parse('rarity'),
    type: FacetType.Set,
    path: ['rarity'],
    label: FacetMessage.Rarity,
    values: RARITY_LABELS,
  },
  { id: FacetId.parse('traits'), type: FacetType.Set, path: ['traits'], label: FacetMessage.Traits },
  { id: FacetId.parse('book'), type: FacetType.Set, path: ['sources', 'book'], label: FacetMessage.Book },
  { id: FacetId.parse('pack'), type: FacetType.Set, path: ['pack'], label: FacetMessage.Pack },
];

/** What a field path finds: the leaves it reaches, `undefined` where a step was missing. */
function leaves(value: unknown, path: FacetPath): readonly unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap((item: unknown) => leaves(item, path));
  }
  const [head, ...rest] = path;
  if (head === undefined) {
    return [value];
  }
  const child: unknown = typeof value === 'object' && value !== null ? Reflect.get(value, head) : undefined;
  return child === undefined ? [undefined] : leaves(child, rest);
}

/** A leaf as a value of a facet of `type`, or `undefined` if it isn't one. */
function leafValue(leaf: unknown, type: FacetType): FacetValue | undefined {
  if (type === FacetType.Flag) {
    if (typeof leaf !== 'boolean') {
      return undefined;
    }
    return leaf ? YES : NO;
  }
  const text = typeof leaf === 'number' && Number.isInteger(leaf) ? String(leaf) : leaf;
  if (type === FacetType.Range && !(typeof text === 'string' && INTEGER.test(text))) {
    return undefined;
  }
  const parsed = FacetValue.safeParse(text);
  return parsed.success ? parsed.data : undefined;
}

/**
 * The values `entry` gives `facet`, each once. An entry with none where the field is missing gives the unknown
 * value, so it stays findable; an empty list (no traits) gives none.
 */
export function facetValues(entry: ContentEntry, facet: FacetDefinition): readonly FacetValue[] {
  const found = facet.derive === undefined ? leaves(entry, facet.path) : facet.derive(entry);
  const values = new Set(found.flatMap((leaf) => leafValue(leaf, facet.type) ?? []));
  if (values.size === 0 && found.includes(undefined)) {
    return [UNKNOWN];
  }
  return [...values];
}
