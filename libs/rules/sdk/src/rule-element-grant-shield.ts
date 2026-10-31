import * as z from 'zod';

import { DamageTypeSchema } from './damage';
import { DamageFormula } from './damage-formula';
import { Hardness } from './physical-item';
import { ruleElementBase, RuleElementKey } from './rule-element-base';
import { SpellRank } from './spell-rank';
import { HitPoints } from './units';

/** The most damage types one Hardness bonus names. */
const BONUS_TYPES_MAX = 20;

/** Extra Hardness against damage of some types: Bone Shield's +2 against piercing and slashing. */
export const HardnessBonus = z.strictObject({
  types: z.array(DamageTypeSchema).min(1).max(BONUS_TYPES_MAX).readonly(),
  bonus: Hardness,
});
export type HardnessBonus = z.infer<typeof HardnessBonus>;

/** How many ranks a shield can be heightened to: spell ranks 2 to 10, with room for the rank it starts at. */
const BRACKETS_MAX = 10;

/** The damage the shards of a shield that breaks deal, to roll with a basic save: Glass Shield's. */
export const ShardDamage = z.strictObject({ damageType: DamageTypeSchema, damage: DamageFormula });
export type ShardDamage = z.infer<typeof ShardDamage>;

/** What a heightened shield changes from `start`: the spell rank (or higher) at which it applies. */
const ShieldBracket = z.strictObject({
  start: SpellRank,
  hardness: Hardness.optional(),
  hitPoints: HitPoints.optional(),
  brokenThreshold: HitPoints.optional(),
  shards: DamageFormula.optional(),
});

/**
 * A shield that no inventory item holds, which an effect gives while it lasts: Hardness, and the Hit Points that
 * decide how it takes damage. Without `hitPoints` it takes none, as a form's shield. A shield with Hit Points breaks
 * at its `brokenThreshold`, half its Hit Points when that is left out, and `brokenThreshold: 0` is a shield with none.
 * `endsOnBlock` ends the effect after one Shield Block; `endsWhenDestroyed` ends it when the Hit Points are spent, and
 * without it a destroyed shield is whole again for the next block. `raised` is a shield the cast raises: it can Shield
 * Block with no Raise a Shield. `hardnessAgainst` adds Hardness against a block of damage that is all of the types it
 * names. `shards` is the damage to roll, with a basic save, when the block that ends the effect breaks it.
 */
export const GrantedShield = z.strictObject({
  hardness: Hardness,
  hitPoints: HitPoints.optional(),
  brokenThreshold: HitPoints.optional(),
  endsOnBlock: z.literal(true).optional(),
  endsWhenDestroyed: z.literal(true).optional(),
  raised: z.literal(true).optional(),
  hardnessAgainst: z.array(HardnessBonus).readonly().optional(),
  shards: ShardDamage.optional(),
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
