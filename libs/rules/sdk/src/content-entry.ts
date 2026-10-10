import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { contentId } from './content-id';
import { ContentKind } from './content-kind';
import { address, envelope } from './entry-envelope';
import { EQUIPMENT_ENTRIES } from './equipment-entries';
import { KIND_DATA, REGISTERED_KINDS } from './kind-data';
import { RulesMessage } from './messages';
import { RuleElementKey } from './rule-element-base';
import type { Trait } from './trait';
import { ContentLevel, Level } from './units';

const KNOWN_KINDS: ReadonlySet<unknown> = new Set(REGISTERED_KINDS);

const FIRST_LEVEL = 1;

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
    kind: z.literal(ContentKind.Archetype),
    ...envelope,
    data: KIND_DATA[ContentKind.Archetype],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Background),
    ...envelope,
    data: KIND_DATA[ContentKind.Background],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Class),
    ...envelope,
    data: KIND_DATA[ContentKind.Class],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.ClassFeature),
    ...envelope,
    // A class feature always has a level: the one its class gains it at.
    level: ContentLevel,
    data: KIND_DATA[ContentKind.ClassFeature],
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
    kind: z.literal(ContentKind.Deity),
    ...envelope,
    data: KIND_DATA[ContentKind.Deity],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Effect),
    ...envelope,
    data: KIND_DATA[ContentKind.Effect],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Feat),
    ...envelope,
    // A feat always has a level: the lowest a character can take it at.
    level: ContentLevel,
    data: KIND_DATA[ContentKind.Feat],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Heritage),
    ...envelope,
    data: KIND_DATA[ContentKind.Heritage],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Language),
    ...envelope,
    data: KIND_DATA[ContentKind.Language],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Ritual),
    ...envelope,
    data: KIND_DATA[ContentKind.Ritual],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Sense),
    ...envelope,
    data: KIND_DATA[ContentKind.Sense],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.Spell),
    ...envelope,
    data: KIND_DATA[ContentKind.Spell],
  }),
  z.strictObject({
    ...address,
    kind: z.literal(ContentKind.SpellcastingTradition),
    ...envelope,
    data: KIND_DATA[ContentKind.SpellcastingTradition],
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
  ...EQUIPMENT_ENTRIES,
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
      checkOnlyLevel1(context);
    }),
  );
