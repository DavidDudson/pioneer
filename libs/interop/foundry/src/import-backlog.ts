import { ContentKindSchema, EntrySlug, ExternalId, PackId } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { UnresolvedTextReason } from './foundry-lang';
import { KindDataGapReason } from './kind-data-gaps';
import { EnvelopeFailureReason } from './translate-envelope';
import { VocabularyGapReason } from './vocabulary-items';

/**
 * A pack's backlog (ADR-0031), the `backlog` of `content/import/<pack>.json`: what the import could not carry over,
 * with Foundry's raw JSON, art stripped. Per entry, its gaps, and when the entry was left out of the pack, why and
 * the whole document; then the documents that yield no entry at all, and the vocabulary items that do not translate.
 */

const TEXT_MAX = 2000;
const GAPS_MAX = 1000;

const Text = z.string().max(TEXT_MAX);

export const BacklogGapType = {
  /** A rule element no translator covers, or one whose translation fails Pioneer's schema. */
  Rule: 'rule',
  /** A `system` field the kind's data has no place for, or a value with no mapping. */
  Field: 'field',
  /** A lang key with no English text, or one only play fills. */
  Text: 'text',
  /** A description enricher, or a part of one, kept as text or dropped. */
  Enricher: 'enricher',
  /** Description markup kept as its text only. */
  Markup: 'markup',
  /** A trait outside Pioneer's vocabulary. */
  Trait: 'trait',
  /** A translated rule element dropped because the entry it references was left out of the pack. */
  Reference: 'reference',
  /** A link in rich text to an entry left out of the pack, which reads as text instead. */
  Link: 'link',
} as const;
export type BacklogGapType = ValueOf<typeof BacklogGapType>;

export const BacklogGap = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal(BacklogGapType.Rule), key: Text, raw: z.unknown() }),
  z.strictObject({
    type: z.literal(BacklogGapType.Field),
    reason: z.enum(KindDataGapReason),
    field: Text,
    raw: z.unknown(),
  }),
  z.strictObject({ type: z.literal(BacklogGapType.Text), reason: z.enum(UnresolvedTextReason), key: Text }),
  z.strictObject({ type: z.literal(BacklogGapType.Enricher), enricher: Text }),
  z.strictObject({ type: z.literal(BacklogGapType.Markup), markup: Text }),
  z.strictObject({ type: z.literal(BacklogGapType.Trait), trait: Text }),
  /** `entry` is the missing entry's `<pack>/<slug>`; `element` is Pioneer's rule element, as translated. */
  z.strictObject({ type: z.literal(BacklogGapType.Reference), entry: Text, element: z.unknown() }),
  /** `entry` is the missing entry's `<pack>/<slug>`; `element` is the `Ref` node. */
  z.strictObject({ type: z.literal(BacklogGapType.Link), entry: Text, element: z.unknown() }),
]);
export type BacklogGap = z.infer<typeof BacklogGap>;

/** Why a translated entry is not in the pack. */
export const LeftOutReason = {
  /** Its kind has no translator yet, or its data failed (the entry's `field` gaps say why). */
  NoKindData: 'no-kind-data',
  /** The entry fails `ContentEntry`. */
  InvalidEntry: 'invalid-entry',
  /** It references an entry that is neither in the import nor in another official pack. */
  UnresolvedReference: 'unresolved-reference',
} as const;
export type LeftOutReason = ValueOf<typeof LeftOutReason>;

export const BacklogItemType = {
  Entry: 'entry',
  /** A document that yields no entry: its slug, name, level or rarity does not translate. */
  Document: 'document',
  Vocabulary: 'vocabulary',
} as const;
export type BacklogItemType = ValueOf<typeof BacklogItemType>;

const EntryItem = z.strictObject({
  type: z.literal(BacklogItemType.Entry),
  pack: PackId,
  slug: EntrySlug,
  /** The Foundry document or journal page; absent on a vocabulary entry. */
  foundry: ExternalId.optional(),
  leftOut: z.strictObject({ reason: z.enum(LeftOutReason), detail: Text }).optional(),
  gaps: z.array(BacklogGap).max(GAPS_MAX).readonly(),
  /** Foundry's document as it was, art stripped, when the entry is left out. */
  document: z.unknown().optional(),
});
export type BacklogEntryItem = z.infer<typeof EntryItem>;

const DocumentItem = z.strictObject({
  type: z.literal(BacklogItemType.Document),
  foundry: ExternalId,
  reason: z.enum(EnvelopeFailureReason),
  detail: Text,
  document: z.unknown(),
});

const VocabularyItem = z.strictObject({
  type: z.literal(BacklogItemType.Vocabulary),
  kind: ContentKindSchema,
  slug: Text,
  reason: z.enum(VocabularyGapReason),
  detail: Text,
});

export const BacklogItem = z.discriminatedUnion('type', [EntryItem, DocumentItem, VocabularyItem]);
export type BacklogItem = z.infer<typeof BacklogItem>;

/** Keys that hold art: a document's and an effect's `img`, a token's `texture`. */
const ART_KEYS: ReadonlySet<string> = new Set(['img', 'texture']);
/** A path to an image or video file, as Foundry writes art (`systems/pf2e/icons/…webp`). */
const ART_PATH = /\.(?:webp|png|jpe?g|gif|svg|webm|mp4)$/iu;

/** `raw` with every art reference removed: art keys, and any other value that is a path to an image (`TokenImage`). */
export function stripArt(raw: unknown): unknown {
  if (Array.isArray(raw)) {
    return raw.filter((each) => typeof each !== 'string' || !ART_PATH.test(each)).map((each) => stripArt(each));
  }
  if (typeof raw === 'object' && raw !== null) {
    return Object.fromEntries(
      Object.entries(raw).flatMap(([key, value]): [string, unknown][] =>
        ART_KEYS.has(key) || (typeof value === 'string' && ART_PATH.test(value)) ? [] : [[key, stripArt(value)]],
      ),
    );
  }
  return raw;
}
