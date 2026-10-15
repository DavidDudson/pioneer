import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId } from './content-id';

/**
 * How Foundry pf2e groups conditions on the sheet. A group says nothing about stacking: Dying, Wounded and Doomed
 * share `death` and apply together. Conditions that replace each other say so in `overrides`.
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

/** What ends or eases a condition for the character without anyone editing it. */
export const ConditionTrigger = {
  /** The Rest action (Player Core, Resting). */
  Rest: 'rest',
  /** The end of the character's turn. */
  TurnEnd: 'turn-end',
} as const;
export type ConditionTrigger = ValueOf<typeof ConditionTrigger>;

/** What a trigger does to the condition: end it, or lower its value by 1 (it ends at 0). */
export const ConditionEffect = {
  Remove: 'remove',
  Lower: 'lower',
} as const;
export type ConditionEffect = ValueOf<typeof ConditionEffect>;

/** How a condition recovers, by trigger: Fatigued is removed by Rest, Drained is lowered by it, Frightened is lowered at the end of the turn. */
export const ConditionRecovery = z.partialRecord(z.enum(ConditionTrigger), z.enum(ConditionEffect)).readonly();
export type ConditionRecovery = z.infer<typeof ConditionRecovery>;

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
  /** How it recovers, by trigger; empty for a condition only an edit or its own duration ends. */
  recovery: ConditionRecovery.default({}),
});
export type ConditionData = z.infer<typeof ConditionData>;
