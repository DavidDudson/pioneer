import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AncestryData } from './ancestry';
import { ContentId, contentId, PackId, Slug } from './content-id';
import { ContentKind } from './content-kind';
import { ContentText } from './content-text';
import { CreatureData } from './creature';
import { RulesMessage } from './messages';
import { RichText } from './rich-text';
import { RuleElements } from './rule-element';
import { AonUrl, SourceRef } from './source-ref';
import { StatisticData } from './statistic';
import { Trait } from './trait';
import { ContentLevel } from './units';

export const Rarity = { Common: 'common', Uncommon: 'uncommon', Rare: 'rare', Unique: 'unique' } as const;
export type Rarity = ValueOf<typeof Rarity>;
export const RaritySchema = z.enum(Rarity);

/** How a feat shows on the sheet when its rule elements alone would place it wrong (play-and-campaigns.md). */
export const DisplayCategory = {
  Active: 'active',
  Modifier: 'modifier',
  GrantOnly: 'grant-only',
  Narrative: 'narrative',
} as const;
export type DisplayCategory = ValueOf<typeof DisplayCategory>;
export const DisplayCategorySchema = z.enum(DisplayCategory);

/** Content's overrides of how the app would show an entry. */
export const DisplayHints = z.strictObject({ category: DisplayCategorySchema.optional() });
export type DisplayHints = z.infer<typeof DisplayHints>;

const EXTERNAL_ID_LENGTH_MAX = 200;

/** An entry's id in another tool: a Foundry compendium UUID, a Pathbuilder id. Never parsed, only matched. */
export const ExternalId = z.string().min(1).max(EXTERNAL_ID_LENGTH_MAX).brand<'ExternalId'>();
export type ExternalId = z.infer<typeof ExternalId>;

/** Where the entry lives elsewhere; `foundry` is what makes Foundry export possible. */
export const ExternalIds = z.strictObject({
  foundry: ExternalId.optional(),
  aon: AonUrl.optional(),
  pathbuilder: ExternalId.optional(),
});
export type ExternalIds = z.infer<typeof ExternalIds>;

/**
 * The `data` schema for each kind that has one. A kind joins here with its schema module and an arm of `Entry`;
 * the rest of `ContentKind` is rejected until it does.
 */
export const KIND_DATA = {
  [ContentKind.Ancestry]: AncestryData,
  [ContentKind.Creature]: CreatureData,
  [ContentKind.Statistic]: StatisticData,
} as const;
export type RegisteredKind = keyof typeof KIND_DATA;

/** Every kind with a `data` schema, in `ContentKind` order. */
export const REGISTERED_KINDS: readonly RegisteredKind[] = Object.values(ContentKind).filter(
  (kind): kind is RegisteredKind => Object.hasOwn(KIND_DATA, kind),
);

const KNOWN_KINDS: ReadonlySet<unknown> = new Set(REGISTERED_KINDS);

/** Kinds whose entries always have a level: a creature's level is part of its stat block. */
const LEVELLED_KINDS: ReadonlySet<ContentKind> = new Set([ContentKind.Creature]);

const TRAITS_MAX = 32;
const SOURCES_MAX = 8;
const SUPERSEDES_MAX = 8;

/** Where an entry lives; `kind` follows, then the rest of the envelope (content-model.md, "Content entry"). */
const address = { id: ContentId, pack: PackId };

/** The fields every entry has after its kind, whatever the kind. */
const envelope = {
  slug: Slug,
  name: ContentText,
  level: ContentLevel.optional(),
  rarity: RaritySchema,
  traits: z.array(Trait).max(TRAITS_MAX).readonly(),
  /** At least one (ADR-0005). */
  sources: z.array(SourceRef).min(1).max(SOURCES_MAX).readonly(),
  description: RichText,
  rules: RuleElements.readonly(),
  display: DisplayHints.optional(),
  externalIds: ExternalIds.optional(),
  /** Entries this one replaces, such as the legacy entry a remaster one supersedes. */
  supersedes: z.array(ContentId).max(SUPERSEDES_MAX).readonly().optional(),
};

/** One arm per registered kind, `data` checked by that kind's schema. */
const Entry = z.discriminatedUnion('kind', [
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Ancestry),
    ...envelope,
    data: KIND_DATA[ContentKind.Ancestry],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Creature),
    ...envelope,
    data: KIND_DATA[ContentKind.Creature],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Statistic),
    ...envelope,
    data: KIND_DATA[ContentKind.Statistic],
  }),
]);
export type ContentEntry = z.output<typeof Entry>;

/** The entry of one kind, with that kind's `data`. */
export type ContentEntryOf<TKind extends RegisteredKind> = Extract<ContentEntry, { readonly kind: TKind }>;

/** Names the `kind` when the value is an object whose `kind` is a string with no registered schema. */
function unknownKindMessage(value: unknown): MessageDescriptor | undefined {
  if (typeof value !== 'object' || value === null || !('kind' in value)) {
    return undefined;
  }
  const { kind } = value;
  return typeof kind === 'string' && !KNOWN_KINDS.has(kind)
    ? message(RulesMessage.EntryUnknownKind, { kind })
    : undefined;
}

type EntryCheck = z.core.ParsePayload<ContentEntry>;

function push(context: EntryCheck, path: readonly PropertyKey[], descriptor: MessageDescriptor): void {
  context.issues.push({ code: 'custom', input: context.value, path: [...path], ...issueParams(descriptor) });
}

/** The id is derived from pack and slug, so an entry can't claim another entry's id. */
function checkId(context: EntryCheck): void {
  const { id, pack, slug } = context.value;
  const expected = contentId(pack, slug);
  if (id !== expected) {
    push(context, ['id'], message(RulesMessage.EntryIdMismatch, { expected, key: `${pack}/${slug}` }));
  }
}

function checkTraits(context: EntryCheck): void {
  const seen = new Set<Trait>();
  for (const [index, trait] of context.value.traits.entries()) {
    if (seen.has(trait)) {
      push(context, ['traits', index], message(RulesMessage.EntryDuplicateTrait, { trait }));
    }
    seen.add(trait);
  }
}

function checkLevel(context: EntryCheck): void {
  const { kind, level } = context.value;
  if (level === undefined && LEVELLED_KINDS.has(kind)) {
    push(context, ['level'], message(RulesMessage.EntryLevelRequired, { kind }));
  }
}

function checkSupersedes(context: EntryCheck): void {
  const { id, supersedes = [] } = context.value;
  for (const [index, superseded] of supersedes.entries()) {
    if (superseded === id) {
      push(context, ['supersedes', index], message(RulesMessage.EntrySupersedesSelf));
    }
  }
}

/**
 * One content entry of any kind (content-model.md): the shared envelope, with `data` checked by the schema for its
 * `kind`. A kind with no schema yet is an error naming it. The id must be UUIDv5 of `<pack>/<slug>`, traits are
 * unique, and an entry never supersedes itself.
 */
export const ContentEntry: z.ZodType<ContentEntry> = z
  .unknown()
  .check((context) => {
    const unknown = unknownKindMessage(context.value);
    if (unknown !== undefined) {
      context.issues.push({
        code: 'custom',
        input: context.value,
        path: ['kind'],
        abort: true,
        ...issueParams(unknown),
      });
    }
  })
  .pipe(
    Entry.check((context) => {
      checkId(context);
      checkTraits(context);
      checkLevel(context);
      checkSupersedes(context);
    }),
  );
