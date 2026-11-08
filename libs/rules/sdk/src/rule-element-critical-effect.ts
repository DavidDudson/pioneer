import type { ValueOf } from '@pioneer/shared/kernel';
import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { DamageTypeSchema } from './damage';
import { ConditionValue } from './origin';
import { DurationCount, DurationUnitSchema } from './rich-text';
import { ModifierTargets, ruleElementBase, RuleElementKey } from './rule-element-base';
import { Dc, Feet } from './units';
import { DiceCount, DieSize } from './weapon';

/** The conditions a critical hit can put on its target; the Strike words each from its own message key (ADR-0009). */
export const CriticalCondition = {
  Deafened: 'deafened',
  Immobilized: 'immobilized',
  Slowed: 'slowed',
} as const;
export type CriticalCondition = ValueOf<typeof CriticalCondition>;

/** How long an effect on the target lasts. */
export const CriticalDurationType = { NextTurnEnd: 'next-turn-end', Time: 'time', Permanent: 'permanent' } as const;
export type CriticalDurationType = ValueOf<typeof CriticalDurationType>;

/** "Until the end of your next turn", "1 minute", or "permanently". */
const CriticalDuration = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal(CriticalDurationType.NextTurnEnd) }),
  z.strictObject({ type: z.literal(CriticalDurationType.Time), count: DurationCount, unit: DurationUnitSchema }),
  z.strictObject({ type: z.literal(CriticalDurationType.Permanent) }),
]);
export type CriticalDuration = z.infer<typeof CriticalDuration>;

/** The saving throws a critical effect can allow. */
export const CriticalSaveStatistic = { Fortitude: 'fortitude', Reflex: 'reflex', Will: 'will' } as const;
export type CriticalSaveStatistic = ValueOf<typeof CriticalSaveStatistic>;

/** The saving throw the target makes against `dc`. */
const CriticalSave = z.strictObject({ statistic: z.enum(CriticalSaveStatistic), dc: Dc });
export type CriticalSave = z.infer<typeof CriticalSave>;

export const CriticalEffectKind = { Condition: 'condition', Damage: 'damage' } as const;
export type CriticalEffectKind = ValueOf<typeof CriticalEffectKind>;

/**
 * A condition on the target for `duration`, which a successful `save` prevents. `criticalFailureDuration` is how long
 * it lasts when the target critically fails the save.
 */
const ConditionEffect = z.strictObject({
  kind: z.literal(CriticalEffectKind.Condition),
  condition: z.enum(CriticalCondition),
  value: ConditionValue.optional(),
  duration: CriticalDuration,
  save: CriticalSave.optional(),
  criticalFailureDuration: CriticalDuration.optional(),
});

export const CriticalDamageAmountType = { Equal: 'equal', Dice: 'dice' } as const;
export type CriticalDamageAmountType = ValueOf<typeof CriticalDamageAmountType>;

/** The damage dealt: as much as the Strike dealt, or `count` dice of `die`. */
const CriticalDamageAmount = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal(CriticalDamageAmountType.Equal) }),
  z.strictObject({ type: z.literal(CriticalDamageAmountType.Dice), count: DiceCount, die: z.enum(DieSize) }),
]);

export const CriticalDamageTargetType = { Others: 'others', Armor: 'armor' } as const;
export type CriticalDamageTargetType = ValueOf<typeof CriticalDamageTargetType>;

/** How many creatures a critical effect reaches. */
export const CreatureCount = Pg.smallint().positive().brand<'CreatureCount'>();
export type CreatureCount = z.infer<typeof CreatureCount>;

/** Who takes the damage: up to `count` other creatures within `within` of the target, or the target's armor or raised shield. */
const CriticalDamageTarget = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal(CriticalDamageTargetType.Others), count: CreatureCount, within: Feet }),
  z.strictObject({ type: z.literal(CriticalDamageTargetType.Armor) }),
]);

/** Damage of `damageType` to others near the target or to its armor, optionally ignoring resistance. */
const DamageEffect = z.strictObject({
  kind: z.literal(CriticalEffectKind.Damage),
  damageType: DamageTypeSchema,
  amount: CriticalDamageAmount,
  target: CriticalDamageTarget,
  ignoresResistance: z.boolean().optional(),
});

/**
 * What a critical hit with a Strike `selectors` reaches does besides its damage: a condition on the target, which a
 * save can prevent, or damage to creatures near it or to its armor. Frost, thundering, shock and corrosive runes carry
 * one. The Strike words it from the fields, so the element holds no text (ADR-0009).
 */
export const CriticalEffectElement = z.strictObject({
  key: z.literal(RuleElementKey.CriticalEffect),
  selectors: ModifierTargets,
  effect: z.discriminatedUnion('kind', [ConditionEffect, DamageEffect]),
  ...ruleElementBase,
});
export type CriticalEffectElement = z.infer<typeof CriticalEffectElement>;
