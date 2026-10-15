import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { DegreeChangeSchema } from './degree-of-success';
import { RulesMessage } from './messages';
import { ModifierTargets, RuleElementKey, ruleElementBase, RuleSlug } from './rule-element-base';

/** How an `AdjustDegreeOfSuccess` reads which degrees it changes: all of them, or one named degree. */
const DegreeAdjustments = z.strictObject({
  all: DegreeChangeSchema.optional(),
  criticalFailure: DegreeChangeSchema.optional(),
  failure: DegreeChangeSchema.optional(),
  success: DegreeChangeSchema.optional(),
  criticalSuccess: DegreeChangeSchema.optional(),
});

/** The kinds of check an `AdjustDegreeOfSuccess` can be limited to, as Foundry pf2e spells them. */
export const AdjustedCheck = { Skill: 'skill', Save: 'save' } as const;
export type AdjustedCheck = ValueOf<typeof AdjustedCheck>;

/**
 * Shifts the degree of success of the targeted checks, as Foundry pf2e's `AdjustDegreeOfSuccess` does: each degree in
 * `adjustment` (or `all`) moves one or two steps, or straight to a degree. `checkType` limits it to skill checks or
 * saves among the targets.
 */
export const AdjustDegreeOfSuccessElement = z
  .strictObject({
    key: z.literal(RuleElementKey.AdjustDegreeOfSuccess),
    selectors: ModifierTargets,
    adjustment: DegreeAdjustments,
    checkType: z.enum(AdjustedCheck).optional(),
    ...ruleElementBase,
  })
  .refine(
    ({ adjustment }) => Object.keys(adjustment).length > 0,
    issueParams(message(RulesMessage.AdjustDegreeNeedsChange)),
  );
export type AdjustDegreeOfSuccessElement = z.infer<typeof AdjustDegreeOfSuccessElement>;

/** Which of two rolls a `RollTwice` keeps. */
export const RollKept = { Higher: 'higher', Lower: 'lower' } as const;
export type RollKept = ValueOf<typeof RollKept>;

/** Rolls the targeted checks twice and keeps the higher or the lower result (fortune and misfortune effects). */
export const RollTwiceElement = z.strictObject({
  key: z.literal(RuleElementKey.RollTwice),
  selectors: ModifierTargets,
  keep: z.enum(RollKept),
  ...ruleElementBase,
});
export type RollTwiceElement = z.infer<typeof RollTwiceElement>;

const SUBSTITUTED_ROLL_MAX = 99;

/** The result a `SubstituteRoll` stands in for the die, from 1 to 99. */
export const SubstitutedRoll = Pg.smallint().min(1).max(SUBSTITUTED_ROLL_MAX).brand<'SubstitutedRoll'>();
export type SubstitutedRoll = z.infer<typeof SubstitutedRoll>;

/**
 * Lets the targeted checks use a fixed result in place of the die roll (Assurance's 10). `slug` names the choice so
 * the player can pick it or not.
 */
export const SubstituteRollElement = z.strictObject({
  key: z.literal(RuleElementKey.SubstituteRoll),
  selectors: ModifierTargets,
  slug: RuleSlug,
  value: SubstitutedRoll,
  ...ruleElementBase,
});
export type SubstituteRollElement = z.infer<typeof SubstituteRollElement>;
