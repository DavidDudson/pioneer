import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId, contentId, PackId, Slug } from './content-id';
import { ContentKind } from './content-kind';
import { ContentText } from './content-text';
import { KIND_DATA, REGISTERED_KINDS } from './kind-data';
import { RulesMessage } from './messages';
import { RichText } from './rich-text';
import { RuleElements } from './rule-element';
import { RuleElementKey } from './rule-element-base';
import { AonUrl, SourceRef } from './source-ref';
import { Trait } from './trait';
import { ContentLevel, Level } from './units';

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

const KNOWN_KINDS: ReadonlySet<unknown> = new Set(REGISTERED_KINDS);

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
    kind: z.literal(ContentKind.Action),
    ...envelope,
    data: KIND_DATA[ContentKind.Action],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Ancestry),
    ...envelope,
    data: KIND_DATA[ContentKind.Ancestry],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Condition),
    ...envelope,
    data: KIND_DATA[ContentKind.Condition],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Creature),
    ...envelope,
    // Creatures run -1 to 25 and always have a level: it is part of the stat block.
    level: Level,
    data: KIND_DATA[ContentKind.Creature],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.DamageType),
    ...envelope,
    data: KIND_DATA[ContentKind.DamageType],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Language),
    ...envelope,
    data: KIND_DATA[ContentKind.Language],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Sense),
    ...envelope,
    data: KIND_DATA[ContentKind.Sense],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Statistic),
    ...envelope,
    data: KIND_DATA[ContentKind.Statistic],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Trait),
    ...envelope,
    data: KIND_DATA[ContentKind.Trait],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.VariantRule),
    ...envelope,
    data: KIND_DATA[ContentKind.VariantRule],
  }),
]);
export type ContentEntry = z.output<typeof Entry>;

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

function checkSupersedes(context: EntryCheck): void {
  const { id, supersedes = [] } = context.value;
  for (const [index, superseded] of supersedes.entries()) {
    if (superseded === id) {
      push(context, ['supersedes', index], message(RulesMessage.EntrySupersedesSelf));
    }
  }
}

/** Every condition a condition implies is applied by an unconditional `GrantItem` of it in `rules`. */
function checkImplies(context: EntryCheck): void {
  const entry = context.value;
  if (entry.kind !== ContentKind.Condition) {
    return;
  }
  // A grant behind a predicate applies only sometimes, so it doesn't make a condition always implied.
  const granted = new Set(
    entry.rules.flatMap((rule) =>
      rule.key === RuleElementKey.GrantItem && rule.predicate === undefined ? [rule.item] : [],
    ),
  );
  for (const [index, implied] of entry.data.implies.entries()) {
    if (!granted.has(implied)) {
      push(context, ['data', 'implies', index], message(RulesMessage.ConditionImpliesWithoutGrant));
    }
  }
}

/**
 * One content entry of any kind (content-model.md): the shared envelope, with `data` checked by the schema for its
 * `kind`. A kind with no schema yet is an error naming it. The id must be UUIDv5 of `<pack>/<slug>`, traits are
 * unique, an entry never supersedes itself, and a condition grants every condition it implies.
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
      checkSupersedes(context);
      checkImplies(context);
    }),
  );
