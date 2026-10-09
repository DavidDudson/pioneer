import { CreatureDefinition, DAMAGE_GROUP_TYPES, DamageGroup, DamageTypeSchema, Immunity } from '@pioneer/rules/sdk';
import type { DamageAdjustment, DamageAdjustmentTarget, DamageType } from '@pioneer/rules/sdk';
import { message, MessageDescriptorSchema } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { DamageCategory } from './expression';
import { DiceMessage } from './messages';
import type { RollResult } from './roll';
import { DamageTotal, RollTotal } from './units';

/** What a target ignores, takes extra from, and shrugs off: the IWR lines of its stat block. */
export const DamageTarget = CreatureDefinition.pick({ immunities: true, weaknesses: true, resistances: true });
export type DamageTarget = z.infer<typeof DamageTarget>;

/** A target with no immunities, weaknesses or resistances. */
export const NO_DEFENCES: DamageTarget = { immunities: [], weaknesses: [], resistances: [] };

/**
 * One instance of damage: everything of one type (unset for untyped) from a roll, as dealt and as
 * taken, with a line for each rule that changed it (critical doubling, splash, immunity, weakness,
 * resistance) so the log can explain the number.
 */
export const DamageInstance = z.object({
  type: DamageTypeSchema.optional(),
  /** The roll's share for this type before doubling, splash left out. */
  rolled: DamageTotal,
  /** After critical doubling, with splash added. */
  dealt: DamageTotal,
  taken: DamageTotal,
  lines: z.array(MessageDescriptorSchema),
});
export type DamageInstance = z.infer<typeof DamageInstance>;

/**
 * A damage roll applied to a target. Persistent damage is kept apart: it is taken at the end of each
 * of the target's turns, not now.
 */
export const DamageApplication = z.object({
  critical: z.boolean(),
  immediate: z.array(DamageInstance),
  persistent: z.array(DamageInstance),
  /** Immediate damage taken now. */
  taken: DamageTotal,
  /** Persistent damage taken at the end of each turn until it ends. */
  persistentTaken: DamageTotal,
});
export type DamageApplication = z.infer<typeof DamageApplication>;

export interface DamageOptions {
  /** A critical success doubles the damage, persistent included, splash not. */
  readonly critical: boolean;
}

const NOT_CRITICAL: DamageOptions = { critical: false };
const CRITICAL_MULTIPLIER = 2;
const ZERO = RollTotal.parse(0);
const NONE = DamageTotal.parse(0);
const NOT_FOUND = -1;

/** The roll's terms of one type and timing, summed, before any rule is applied. */
interface Pooled {
  readonly type: DamageType | undefined;
  readonly persistent: boolean;
  readonly rolled: RollTotal;
  readonly splash: RollTotal;
}

/** Groups the roll's terms into instances, by type and whether persistent, in the order first rolled. */
function pool(roll: RollResult): readonly Pooled[] {
  const pools: Pooled[] = [];
  for (const { term, value } of roll.terms) {
    const { type, category } = term.tags;
    const persistent = category === DamageCategory.Persistent;
    const index = pools.findIndex((entry) => entry.type === type && entry.persistent === persistent);
    const current = pools[index] ?? { type, persistent, rolled: ZERO, splash: ZERO };
    const next =
      category === DamageCategory.Splash
        ? { ...current, splash: RollTotal.parse(current.splash + value) }
        : { ...current, rolled: RollTotal.parse(current.rolled + value) };
    pools.splice(index === NOT_FOUND ? pools.length : index, 1, next);
  }
  return pools;
}

/** Damage after one rule, and the line saying what the rule did (none when it did nothing). */
interface Applied {
  readonly amount: DamageTotal;
  readonly lines: readonly MessageDescriptor[];
}

/** An instance as dealt: its share of the roll, doubled on a critical, splash added undoubled. */
interface Dealt extends Applied {
  readonly rolled: DamageTotal;
}

function dealt(pooled: Pooled, critical: boolean): Dealt {
  const rolled = DamageTotal.parse(Math.max(pooled.rolled, 0));
  const splash = DamageTotal.parse(Math.max(pooled.splash, 0));
  const doubled = DamageTotal.parse(critical ? rolled * CRITICAL_MULTIPLIER : rolled);
  const lines = [
    critical && rolled > 0 ? message(DiceMessage.DamageCritical, { rolled, doubled }) : undefined,
    splash > 0 ? message(DiceMessage.DamageSplash, { splash }) : undefined,
  ].filter((line) => line !== undefined);
  return { rolled, amount: DamageTotal.parse(doubled + splash), lines };
}

/** Whether a weakness or resistance naming `target` applies to damage of `type` (unset: untyped). */
function covers(target: DamageAdjustmentTarget, type: DamageType | undefined): boolean {
  if (target === DamageGroup.All) {
    return true;
  }
  if (target === DamageGroup.Physical || target === DamageGroup.Energy) {
    return type !== undefined && DAMAGE_GROUP_TYPES[target].includes(type);
  }
  return target === type;
}

/** The highest of `adjustments` that applies to `type`: only one weakness or resistance counts per instance. */
function highest(adjustments: readonly DamageAdjustment[], type: DamageType | undefined): DamageAdjustment | undefined {
  return adjustments
    .filter((adjustment) => covers(adjustment.type, type))
    .toSorted((left, right) => right.value - left.value)[0];
}

/** The highest applicable weakness adds its value once, if the instance deals any damage. */
function weaken(amount: DamageTotal, type: DamageType | undefined, target: DamageTarget): Applied {
  const weakness = amount > 0 ? highest(target.weaknesses, type) : undefined;
  if (weakness === undefined) {
    return { amount, lines: [] };
  }
  return {
    amount: DamageTotal.parse(amount + weakness.value),
    lines: [message(DiceMessage.DamageWeakness, { value: weakness.value, target: weakness.type })],
  };
}

/** The highest applicable resistance removes up to its value. */
function resist(amount: DamageTotal, type: DamageType | undefined, target: DamageTarget): Applied {
  const resistance = amount > 0 ? highest(target.resistances, type) : undefined;
  if (resistance === undefined) {
    return { amount, lines: [] };
  }
  const prevented = Math.min(resistance.value, amount);
  return {
    amount: DamageTotal.parse(amount - prevented),
    lines: [message(DiceMessage.DamageResistance, { value: resistance.value, target: resistance.type, prevented })],
  };
}

/** Deals one instance, then immunity removes it or the highest weakness and resistance adjust it. */
function deal(pooled: Pooled, target: DamageTarget, critical: boolean): DamageInstance {
  const { rolled, amount, lines } = dealt(pooled, critical);
  const type = pooled.type === undefined ? {} : { type: pooled.type };
  if (pooled.type !== undefined && target.immunities.includes(Immunity.parse(pooled.type))) {
    const immune = message(DiceMessage.DamageImmune, { type: pooled.type, prevented: amount });
    return { ...type, rolled, dealt: amount, taken: NONE, lines: [...lines, immune] };
  }
  const weakened = weaken(amount, pooled.type, target);
  const resisted = resist(weakened.amount, pooled.type, target);
  return {
    ...type,
    rolled,
    dealt: amount,
    taken: resisted.amount,
    lines: [...lines, ...weakened.lines, ...resisted.lines],
  };
}

function sum(instances: readonly DamageInstance[]): DamageTotal {
  let total = 0;
  for (const instance of instances) {
    total += instance.taken;
  }
  return DamageTotal.parse(total);
}

/**
 * Applies a damage roll to `target`. Terms are pooled into one instance per damage type (untagged
 * terms are untyped), persistent damage apart from the rest, and splash joins the immediate damage
 * of its type. Each instance is doubled on a critical (the remaster default, doubling the total),
 * then immunities, weaknesses and resistances apply in that order.
 */
export function applyDamage(
  roll: RollResult,
  target: DamageTarget,
  { critical }: DamageOptions = NOT_CRITICAL,
): DamageApplication {
  const pools = pool(roll);
  const immediate = pools.filter((pooled) => !pooled.persistent).map((pooled) => deal(pooled, target, critical));
  const persistent = pools.filter((pooled) => pooled.persistent).map((pooled) => deal(pooled, target, critical));
  return { critical, immediate, persistent, taken: sum(immediate), persistentTaken: sum(persistent) };
}
