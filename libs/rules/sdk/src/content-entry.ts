import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { contentId, entrySlug, slugKind, slugName } from './content-id';
import { ContentKind } from './content-kind';
import { address, envelope } from './entry-envelope';
import { EQUIPMENT_ARMS } from './equipment-entries';
import { KIND_DATA_MODEL, REGISTERED_KINDS } from './kind-data';
import { RulesMessage } from './messages';
import { unconditionalGrants } from './rule-reference';
import type { Trait } from './trait';
import { ContentLevel, Level } from './units';

const KNOWN_KINDS: ReadonlySet<unknown> = new Set(REGISTERED_KINDS);

const FIRST_LEVEL = 1;

/** One arm per registered kind, `data` checked by that kind's schema. */
export const ENTRY_ARMS = {
  [ContentKind.Action]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Action),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Action],
  }),
  [ContentKind.Ancestry]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Ancestry),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Ancestry],
  }),
  [ContentKind.AncestryFeature]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.AncestryFeature),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.AncestryFeature],
  }),
  [ContentKind.Archetype]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Archetype),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Archetype],
  }),
  [ContentKind.Background]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Background),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Background],
  }),
  [ContentKind.Class]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Class),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Class],
  }),
  [ContentKind.ClassFeature]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.ClassFeature),
    ...envelope,
    // A class feature always has a level: the one its class gains it at.
    level: ContentLevel,
    data: KIND_DATA_MODEL[ContentKind.ClassFeature],
  }),
  [ContentKind.Condition]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Condition),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Condition],
  }),
  [ContentKind.Creature]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Creature),
    ...envelope,
    // Creatures run -1 to 25 and always have a level: it is part of the stat block.
    level: Level,
    data: KIND_DATA_MODEL[ContentKind.Creature],
  }),
  [ContentKind.DamageType]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.DamageType),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.DamageType],
  }),
  [ContentKind.Deity]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Deity),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Deity],
  }),
  [ContentKind.Effect]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Effect),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Effect],
  }),
  [ContentKind.Environment]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Environment),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Environment],
  }),
  [ContentKind.Feat]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Feat),
    ...envelope,
    // A feat always has a level: the lowest a character can take it at.
    level: ContentLevel,
    data: KIND_DATA_MODEL[ContentKind.Feat],
  }),
  [ContentKind.Heritage]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Heritage),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Heritage],
  }),
  [ContentKind.Language]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Language),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Language],
  }),
  [ContentKind.Ritual]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Ritual),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Ritual],
  }),
  [ContentKind.Sense]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Sense),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Sense],
  }),
  [ContentKind.Spell]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Spell),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Spell],
  }),
  [ContentKind.SpellcastingTradition]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.SpellcastingTradition),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.SpellcastingTradition],
  }),
  [ContentKind.Statistic]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Statistic),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Statistic],
  }),
  [ContentKind.Trait]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Trait),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.Trait],
  }),
  [ContentKind.VariantRule]: z.strictObject({
    ...address,
    kind: z.literal(ContentKind.VariantRule),
    ...envelope,
    data: KIND_DATA_MODEL[ContentKind.VariantRule],
  }),
  ...EQUIPMENT_ARMS,
} as const;

/** The model of an entry: `rules` are references, so the content model stays clear of the rule elements. */
const Entry = z.discriminatedUnion('kind', [
  ENTRY_ARMS[ContentKind.Action],
  ENTRY_ARMS[ContentKind.Ancestry],
  ENTRY_ARMS[ContentKind.AncestryFeature],
  ENTRY_ARMS[ContentKind.Archetype],
  ENTRY_ARMS[ContentKind.Background],
  ENTRY_ARMS[ContentKind.Class],
  ENTRY_ARMS[ContentKind.ClassFeature],
  ENTRY_ARMS[ContentKind.Condition],
  ENTRY_ARMS[ContentKind.Creature],
  ENTRY_ARMS[ContentKind.DamageType],
  ENTRY_ARMS[ContentKind.Deity],
  ENTRY_ARMS[ContentKind.Effect],
  ENTRY_ARMS[ContentKind.Environment],
  ENTRY_ARMS[ContentKind.Feat],
  ENTRY_ARMS[ContentKind.Heritage],
  ENTRY_ARMS[ContentKind.Language],
  ENTRY_ARMS[ContentKind.Ritual],
  ENTRY_ARMS[ContentKind.Sense],
  ENTRY_ARMS[ContentKind.Spell],
  ENTRY_ARMS[ContentKind.SpellcastingTradition],
  ENTRY_ARMS[ContentKind.Statistic],
  ENTRY_ARMS[ContentKind.Trait],
  ENTRY_ARMS[ContentKind.VariantRule],
  ENTRY_ARMS[ContentKind.Armor],
  ENTRY_ARMS[ContentKind.Consumable],
  ENTRY_ARMS[ContentKind.Equipment],
  ENTRY_ARMS[ContentKind.Kit],
  ENTRY_ARMS[ContentKind.Rune],
  ENTRY_ARMS[ContentKind.Shield],
  ENTRY_ARMS[ContentKind.Treasure],
  ENTRY_ARMS[ContentKind.Weapon],
]);

export type ContentEntryModel = z.output<typeof Entry>;

/** Names the `kind` when the value is an object whose `kind` is a string with no registered schema. */
const KindedValue = z.looseObject({ kind: z.string().brand<'EntryKind'>() });

function unknownKindMessage(kinded: z.output<typeof KindedValue>): MessageDescriptor | undefined {
  return KNOWN_KINDS.has(kinded.kind) ? undefined : message(RulesMessage.EntryUnknownKind, { kind: kinded.kind });
}

type EntryCheck = z.core.ParsePayload<ContentEntryModel>;

function push(context: EntryCheck, path: readonly PropertyKey[], descriptor: MessageDescriptor): void {
  context.issues.push({ code: 'custom', input: context.value, path: [...path], ...issueParams(descriptor) });
}

/** An entry slug names its kind first, and it must be the entry's kind. */
function checkSlugKind(context: EntryCheck): void {
  const { kind, slug } = context.value;

  if (slugKind(slug) !== kind) {
    const expected = entrySlug(kind, slugName(slug));
    push(context, ['slug'], message(RulesMessage.EntrySlugKindMismatch, { expected }));
  }
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

/** A feat only taken at 1st level is a 1st-level feat. */
function checkOnlyLevel1(context: EntryCheck): void {
  const entry = context.value;

  if (entry.kind === ContentKind.Feat && entry.data.onlyLevel1 === true && entry.level !== FIRST_LEVEL) {
    push(context, ['level'], message(RulesMessage.FeatOnlyLevel1));
  }
}

/** Every condition a condition implies is applied by an unconditional `GrantItem` of it in `rules`. */
function checkImplies(context: EntryCheck): void {
  const entry = context.value;

  if (entry.kind !== ContentKind.Condition) {
    return;
  }

  // A grant behind a predicate applies only sometimes, so it doesn't make a condition always implied.
  const granted = unconditionalGrants(entry.rules);

  for (const [index, implied] of entry.data.implies.entries()) {
    if (!granted.has(implied)) {
      push(context, ['data', 'implies', index], message(RulesMessage.ConditionImpliesWithoutGrant));
    }
  }
}

/** Reports a `kind` with no registered schema, and stops there. */
export function checkKnownKind(context: z.core.ParsePayload): void {
  const kinded = KindedValue.safeParse(context.value);
  const unknown = kinded.success ? unknownKindMessage(kinded.data) : undefined;

  if (unknown !== undefined) {
    context.issues.push({
      code: 'custom',
      input: context.value,
      path: ['kind'],
      abort: true,
      ...issueParams(unknown),
    });
  }
}

/** What holds across kinds: the id, the slug, unique traits, no self-supersede, implied conditions, feat level. */
export function checkEntry(context: EntryCheck): void {
  checkId(context);
  checkSlugKind(context);
  checkTraits(context);
  checkSupersedes(context);
  checkImplies(context);
  checkOnlyLevel1(context);
}

/**
 * One content entry of any kind (content-model.md) as the content model sees it: the shared envelope, with `data`
 * checked by the schema for its `kind` and `rules` held as references. `ContentEntry` (`typed-content-entry.ts`) is
 * the same with every rule element parsed. A kind with no schema yet is an error naming it. The id must be UUIDv5 of
 * `<pack>/<slug>`, traits are unique, an entry never supersedes itself, and a condition grants every condition it
 * implies.
 */
export const ContentEntryModel: z.ZodType<ContentEntryModel> = z
  .unknown()
  .check(checkKnownKind)
  .pipe(Entry.check(checkEntry));
