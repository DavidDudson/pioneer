import * as z from 'zod';

import { Hardness } from './physical-item';
import { ruleElementBase, RuleElementKey } from './rule-element-base';
import { SpellRank } from './spell-rank';
import { HitPoints } from './units';

/** How many ranks a shield can be heightened to: spell ranks 2 to 10, with room for the rank it starts at. */
const BRACKETS_MAX = 10;

/** What a heightened shield changes from `start`: the spell rank (or higher) at which it applies. */
const ShieldBracket = z.strictObject({
  start: SpellRank,
  hardness: Hardness.optional(),
  hitPoints: HitPoints.optional(),
  brokenThreshold: HitPoints.optional(),
});

/**
 * A shield that no inventory item holds, which an effect gives while it lasts: Hardness, and the Hit Points that
 * decide how it takes damage. Without `hitPoints` it takes none, as a form's shield. A shield with Hit Points breaks
 * at its `brokenThreshold`, half its Hit Points when that is left out, and `brokenThreshold: 0` is a shield with none.
 * `endsOnBlock` ends the effect after one Shield Block; `endsWhenDestroyed` ends it when the Hit Points are spent, and
 * without it a destroyed shield is whole again for the next block. `raised` is a shield the cast raises: it can Shield
 * Block with no Raise a Shield.
 */
export const GrantedShield = z.strictObject({
  hardness: Hardness,
  hitPoints: HitPoints.optional(),
  brokenThreshold: HitPoints.optional(),
  endsOnBlock: z.literal(true).optional(),
  endsWhenDestroyed: z.literal(true).optional(),
  raised: z.literal(true).optional(),
  brackets: z.array(ShieldBracket).max(BRACKETS_MAX).readonly().optional(),
});
export type GrantedShield = z.infer<typeof GrantedShield>;

/**
 * The effect carries a shield while its predicate holds (Shield, Shielded Arm). Raise a Shield and Shield Block work
 * with it as with a held shield. A Pioneer element: Foundry gives such shields in text only.
 */
export const GrantShieldElement = z.strictObject({
  key: z.literal(RuleElementKey.GrantShield),
  ...GrantedShield.shape,
  ...ruleElementBase,
});
export type GrantShieldElement = z.infer<typeof GrantShieldElement>;
