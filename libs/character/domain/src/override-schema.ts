import { Modifier, ModifierType, OverrideNote, Predicate, Selector } from '@pioneer/rules/sdk';
import { issueParams, message, UserId, Uuid } from '@pioneer/shared/kernel';
import type { Temporal, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** One override a character carries. */
export const OverrideId = Uuid.brand<'OverrideId'>();
export type OverrideId = z.infer<typeof OverrideId>;

/** The most overrides a character carries; far above any table's use, so a document stays small. */
export const OVERRIDES_MAX = 200;

/** The most earlier states an override keeps. */
export const OVERRIDE_REVISIONS_MAX = 50;

/** Whether an override adds a typed modifier to a statistic, or pins its value. */
export const OverrideMode = { Adjust: 'adjust', Set: 'set' } as const;
export type OverrideMode = ValueOf<typeof OverrideMode>;

const { Attribute: _attribute, ...ADJUSTABLE_TYPES } = ModifierType;

/** The modifier types an adjust override takes: any but attribute, which names the attribute it swaps with. */
export const OverrideModifierType = z.enum(ADJUSTABLE_TYPES);
export type OverrideModifierType = z.infer<typeof OverrideModifierType>;

/** When an override was made, as the ISO timestamp the server stamps. */
export const OverrideTime = z.iso.datetime({ precision: 3 }).brand<'OverrideTime'>();
export type OverrideTime = z.infer<typeof OverrideTime>;

/** `instant` as an override stamps it. */
export function overrideTime(instant: Temporal.Instant): OverrideTime {
  return OverrideTime.parse(instant.toString({ smallestUnit: 'millisecond' }));
}

/** The most characters of a reason, as the origin hop that names it allows. */
const OVERRIDE_REASON_MAX = 500;

/**
 * Why a statistic differs from what the rules give, in the author's own words. Required: an override with no reason,
 * or only spaces, is refused with `character.validation.overrideReasonRequired`.
 */
export const OverrideReason = z
  .string()
  .trim()
  .refine((reason) => reason.length > 0, issueParams(message('character.validation.overrideReasonRequired')))
  .max(OVERRIDE_REASON_MAX)
  .brand<'OverrideNote'>();
export type OverrideReason = z.infer<typeof OverrideReason>;

/** What an author gives for an override: its target, how it changes it, and why. */
export const OverrideInput = z.strictObject({
  target: Selector,
  mode: z.enum(OverrideMode),
  value: Modifier,
  /** Adjust only; absent reads as untyped. */
  type: OverrideModifierType.optional(),
  predicate: Predicate.optional(),
  reason: OverrideReason,
});
export type OverrideInput = z.infer<typeof OverrideInput>;

/** An earlier state of an override, kept when someone edits it. */
const OverrideRevision = z.strictObject({
  by: UserId,
  at: OverrideTime,
  value: Modifier,
  type: OverrideModifierType.optional(),
  predicate: Predicate.optional(),
  reason: OverrideNote,
});
export type OverrideRevision = z.infer<typeof OverrideRevision>;

/** Who removed an override, when, and the reason they gave; a removed override stays, so the record is whole. */
const OverrideRemoval = z.strictObject({ by: UserId, at: OverrideTime, reason: OverrideNote });

/**
 * A modifier or pinned value put on a statistic by hand (character-model.md, Overrides). Stored as the author's inputs;
 * the rule element it compiles to is derived on every read (ADR-0004). `by` and `at` are the latest author's, the
 * states they replaced are in `revisions`, and a removed override stays with `removed` set (ADR-0062).
 */
export const OverrideSchema = z.strictObject({
  id: OverrideId,
  target: Selector,
  mode: z.enum(OverrideMode),
  value: Modifier,
  type: OverrideModifierType.optional(),
  predicate: Predicate.optional(),
  reason: OverrideNote,
  by: UserId,
  at: OverrideTime,
  revisions: z.array(OverrideRevision).max(OVERRIDE_REVISIONS_MAX).readonly().default([]),
  removed: OverrideRemoval.optional(),
});
export type Override = z.infer<typeof OverrideSchema>;
