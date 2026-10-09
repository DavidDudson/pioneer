import type { ValueOf } from '@pioneer/shared/kernel';
import { InstantCodec, Pg, UserId, Uuid } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { ContentId } from './content-id';
import { SlotKey } from './selector';
import { SourceRef } from './source-ref';

/** Position of a rule element in its entry's `rules` array. */
export const RuleIndex = Pg.smallint().nonnegative().brand<'RuleIndex'>();
export type RuleIndex = z.infer<typeof RuleIndex>;

/** One item in a character's inventory. */
export const InventoryItemId = Uuid.brand<'InventoryItemId'>();
export type InventoryItemId = z.infer<typeof InventoryItemId>;

/** A campaign event that caused something, such as the Demoralize that left a character frightened. */
export const EventRef = Uuid.brand<'EventRef'>();
export type EventRef = z.infer<typeof EventRef>;

/** A valued condition's value: _frightened 2_. */
export const ConditionValue = Pg.smallint().positive().brand<'ConditionValue'>();
export type ConditionValue = z.infer<typeof ConditionValue>;

const NOTE_LENGTH_MAX = 500;

/** Why someone set an override, in their own words (not translated). */
export const OverrideNote = z.string().min(1).max(NOTE_LENGTH_MAX).brand<'OverrideNote'>();
export type OverrideNote = z.infer<typeof OverrideNote>;

export const ItemState = {
  Worn: 'worn',
  Held: 'held',
  Invested: 'invested',
} as const;
export type ItemState = ValueOf<typeof ItemState>;

export const OriginHopKind = {
  Choice: 'choice',
  Grant: 'grant',
  Inventory: 'inventory',
  Condition: 'condition',
  Effect: 'effect',
  Override: 'override',
  Variant: 'variant',
} as const;
export type OriginHopKind = ValueOf<typeof OriginHopKind>;

/** One step in the chain that put something on a character. */
export const OriginHop = z.discriminatedUnion('kind', [
  /** The player picked it for this slot. */
  z.strictObject({ kind: z.literal(OriginHopKind.Choice), slot: SlotKey }),
  /** Another entry's rule element granted it. */
  z.strictObject({ kind: z.literal(OriginHopKind.Grant), by: ContentId, rule: RuleIndex }),
  z.strictObject({ kind: z.literal(OriginHopKind.Inventory), item: InventoryItemId, state: z.enum(ItemState) }),
  z.strictObject({
    kind: z.literal(OriginHopKind.Condition),
    condition: ContentId,
    value: ConditionValue.optional(),
    appliedBy: EventRef.optional(),
  }),
  z.strictObject({ kind: z.literal(OriginHopKind.Effect), effect: ContentId, appliedBy: EventRef.optional() }),
  /** Someone set it by hand: who, when and why. */
  z.strictObject({
    kind: z.literal(OriginHopKind.Override),
    by: UserId,
    at: InstantCodec,
    note: OverrideNote.optional(),
  }),
  /** A variant rule (Proficiency Without Level, Free Archetype) added it. */
  z.strictObject({ kind: z.literal(OriginHopKind.Variant), rule: ContentId }),
]);
export type OriginHop = z.output<typeof OriginHop>;

/** Longest grant chain an origin may record; real chains are a handful of hops. */
const HOPS_MAX = 64;
const SOURCES_MAX = 16;

/**
 * Why something is on the character: the hops from the character down to it (outermost first:
 * Fighter, then Shield Block feature, then Shield Block action), the entry holding the rule
 * element, and that entry's sources. Every breakdown line, grant, action and open slot has one.
 */
export const Origin = z.strictObject({
  hops: z.array(OriginHop).max(HOPS_MAX),
  entry: ContentId,
  sources: z.array(SourceRef).min(1).max(SOURCES_MAX),
});
export type Origin = z.output<typeof Origin>;
