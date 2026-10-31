import { Modifier, OverrideNote, Predicate, Selector } from '@pioneer/rules/sdk';
import { issueParams, message, UserId, Uuid } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { OverrideModifierType, OverrideReason, OverrideRole, OverrideTime } from './override-schema';

/** One custom effect a character carries. */
export const CustomEffectId = Uuid.brand<'CustomEffectId'>();
export type CustomEffectId = z.infer<typeof CustomEffectId>;

/** The most custom effects a character carries, removed ones included, so a document stays small. */
export const CUSTOM_EFFECTS_MAX = 100;

/** The most lines one custom effect bundles. */
export const CUSTOM_EFFECT_LINES_MAX = 20;

/** The most on/off changes an effect keeps on record; past it the effect can no longer be toggled. */
export const CUSTOM_EFFECT_TOGGLES_MAX = 100;

const CUSTOM_EFFECT_NAME_MAX = 80;

/** What a custom effect is called in the breakdown. Required: a blank name is refused with `character.validation.customEffectNameRequired`. */
export const CustomEffectName = z
  .string()
  .trim()
  .refine((name) => name.length > 0, issueParams(message('character.validation.customEffectNameRequired')))
  .max(CUSTOM_EFFECT_NAME_MAX)
  .brand<'CustomEffectName'>();
export type CustomEffectName = z.infer<typeof CustomEffectName>;

/** One adjustment in a custom effect: a typed modifier on a statistic. */
export const CustomEffectLine = z.strictObject({
  target: Selector,
  value: Modifier,
  /** Absent reads as untyped. */
  type: OverrideModifierType.optional(),
  predicate: Predicate.optional(),
});
export type CustomEffectLine = z.infer<typeof CustomEffectLine>;

/** What an author gives for a custom effect: its name, the reason for it, and at least one line. */
export const CustomEffectInput = z.strictObject({
  name: CustomEffectName,
  reason: OverrideReason,
  lines: z.array(CustomEffectLine).min(1).max(CUSTOM_EFFECT_LINES_MAX).readonly(),
});
export type CustomEffectInput = z.infer<typeof CustomEffectInput>;

/** One switch of an effect on or off: who, what they were to the character, when, and which way. */
const CustomEffectToggle = z.strictObject({
  by: UserId,
  byRole: z.enum(OverrideRole),
  at: OverrideTime,
  enabled: z.boolean(),
});
export type CustomEffectToggle = z.infer<typeof CustomEffectToggle>;

/** Who removed an effect, when, and the reason they gave; a removed effect stays, so the record is whole. */
const CustomEffectRemoval = z.strictObject({ by: UserId, at: OverrideTime, reason: OverrideNote });

/**
 * A named bundle of adjust lines with one reason that the owner switches on and off (character-model.md, Custom
 * effects). Stored as the author's inputs; the rule elements it compiles to are derived on every read (ADR-0004).
 * Switching it off compiles nothing, on restores every line. A removed effect stays with `removed` set (ADR-0062).
 */
export const CustomEffectSchema = z.strictObject({
  id: CustomEffectId,
  name: CustomEffectName,
  reason: OverrideNote,
  lines: z.array(CustomEffectLine).min(1).max(CUSTOM_EFFECT_LINES_MAX).readonly(),
  by: UserId,
  /** What `by` was to the character; a GM's effect is the owner's to switch, not to remove. */
  byRole: z.enum(OverrideRole),
  at: OverrideTime,
  enabled: z.boolean(),
  toggles: z.array(CustomEffectToggle).max(CUSTOM_EFFECT_TOGGLES_MAX).readonly().default([]),
  removed: CustomEffectRemoval.optional(),
});
export type CustomEffect = z.infer<typeof CustomEffectSchema>;

/** Everyone who added, switched or removed one of `effects`, once each. */
export function customEffectAuthorIds(effects: readonly CustomEffect[]): readonly UserId[] {
  const ids = effects.flatMap(({ by, toggles, removed }) => [
    by,
    ...toggles.map((toggle) => toggle.by),
    ...(removed === undefined ? [] : [removed.by]),
  ]);
  return [...new Set(ids)];
}
