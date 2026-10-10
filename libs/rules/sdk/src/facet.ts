import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { ContentEntry } from './content-entry';
import { Slug } from './content-id';
import { Rarity } from './entry-fields';
import type { RegisteredKind } from './kind-data';

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

export const FlagValue = { Yes: 'yes', No: 'no' } as const;
export type FlagValue = ValueOf<typeof FlagValue>;

/** A message key for a facet or one of its values, in this lib's `i18n/en.json` under `rules.facet.*`. */
export const FacetLabel = z.string().brand<'FacetLabel'>();
export type FacetLabel = z.infer<typeof FacetLabel>;

/** Where a facet reads its values: property names from the entry down. An array on the way is read element-wise. */
export type FacetPath = readonly PropertyKey[];

/**
 * A facet as data: adding one is a definition, not a UI change. A `set` facet whose values are a closed list names
 * them with their labels; one whose values come from content (traits, books) leaves `values` out.
 */
export interface FacetDefinition {
  readonly id: FacetId;
  readonly type: FacetType;
  readonly path: FacetPath;
  readonly label: FacetLabel;
  readonly values?: ReadonlyMap<FacetValue, FacetLabel>;
}

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

/**
 * Facets a kind adds to the common ones. A kind joins here alongside its schema (`kind-data.ts`) when its facets
 * are defined.
 */
const KIND_FACETS: Readonly<Partial<Record<RegisteredKind, readonly FacetDefinition[]>>> = {};

/** The facets for a list holding `kinds`: the common ones, then each kind's own, each facet once. */
export function facetsFor(kinds: readonly RegisteredKind[]): readonly FacetDefinition[] {
  const byId = new Map<FacetId, FacetDefinition>(COMMON_FACETS.map((facet) => [facet.id, facet]));
  for (const kind of kinds) {
    for (const facet of KIND_FACETS[kind] ?? []) {
      byId.set(facet.id, facet);
    }
  }
  return [...byId.values()];
}

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
  const found = leaves(entry, facet.path);
  const values = new Set(found.flatMap((leaf) => leafValue(leaf, facet.type) ?? []));
  if (values.size === 0 && found.includes(undefined)) {
    return [UNKNOWN];
  }
  return [...values];
}
