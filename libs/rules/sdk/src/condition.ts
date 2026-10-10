import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId } from './content-id';

/**
 * Conditions that exclude each other within a set, as Foundry pf2e groups them: a creature has one attitude,
 * one detection state, one of the death conditions' track.
 */
export const ConditionGroup = {
  Abilities: 'abilities',
  Attitudes: 'attitudes',
  Death: 'death',
  Detection: 'detection',
  Senses: 'senses',
} as const;
export type ConditionGroup = ValueOf<typeof ConditionGroup>;
const ConditionGroupSchema = z.enum(ConditionGroup);

const CONDITION_REFS_MAX = 8;

/**
 * A condition's `data` on the `ContentEntry` envelope. What it does to statistics is in `rules`; this is what the
 * app needs to apply and stack it.
 */
export const ConditionData = z.strictObject({
  /** Whether it carries a value (Frightened 2) or is simply on or off (Blinded). */
  valued: z.boolean(),
  group: ConditionGroupSchema.optional(),
  /** Conditions this one replaces while it lasts (Blinded overrides Dazzled). */
  overrides: z.array(ContentId).max(CONDITION_REFS_MAX).readonly(),
  /**
   * Conditions it brings with it (Grabbed implies Off-Guard and Immobilized). Each also needs a `GrantItem` in
   * `rules`, which is what applies it; this list is what the sheet shows.
   */
  implies: z.array(ContentId).max(CONDITION_REFS_MAX).readonly(),
});
export type ConditionData = z.infer<typeof ConditionData>;
