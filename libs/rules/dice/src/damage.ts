import {
  CreatureDefinition,
  DAMAGE_GROUP_TYPES,
  DamageGroup,
  DamageType,
  DamageTypeSchema,
  Immunity,
} from '@pioneer/rules/sdk';
import type { DamageAdjustment, DamageAdjustmentTarget } from '@pioneer/rules/sdk';
import { message, MessageDescriptorSchema } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { DamageCategory } from './expression';
import type { Term } from './expression';
import { DiceMessage } from './messages';
import type { RollResult, TermResult } from './roll';
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
/** Foundry pf2e's immunity slug for creatures that take no extra damage from critical hits. */
const CRITICAL_HITS = Immunity.parse('critical-hits');
const PRECISION = Immunity.parse(DamageType.Precision);

/** How a critical changes the damage: not at all, doubled, or not doubled because the target is immune. */
const Doubling = { None: 'none', Doubled: 'doubled', Immune: 'immune' } as const;
type Doubling = ValueOf<typeof Doubling>;

/** The roll's terms of one type and timing, summed, before any rule is applied. */
interface Pooled {
  readonly type: DamageType | undefined;
  readonly persistent: boolean;
  readonly rolled: RollTotal;
  /** Precision damage added to this instance: it takes the attack's type, so IWR sees one instance. */
  readonly precision: RollTotal;
  readonly splash: RollTotal;
}

function isPrecision(term: Term): boolean {
  return term.tags.type === DamageType.Precision && term.tags.category === undefined;
}

/** Adds a term's value to the instance of its type and timing, starting one if there is none yet. */
function addTerm(pools: Pooled[], { term, value }: TermResult): void {
  const { type, category } = term.tags;
  const persistent = category === DamageCategory.Persistent;
  const index = pools.findIndex((entry) => entry.type === type && entry.persistent === persistent);
  const current = pools[index] ?? { type, persistent, rolled: ZERO, precision: ZERO, splash: ZERO };
  const next =
    category === DamageCategory.Splash
      ? { ...current, splash: RollTotal.parse(current.splash + value) }
      : { ...current, rolled: RollTotal.parse(current.rolled + value) };
  pools.splice(index === NOT_FOUND ? pools.length : index, 1, next);
}

/**
 * Groups the roll's terms into instances, by type and whether persistent, in the order first rolled.
 * Precision joins the first immediate instance, as Foundry adds it to the base damage; with nothing to
 * join it stays an instance of its own.
 */
function pool(roll: RollResult): readonly Pooled[] {
  const pools: Pooled[] = [];
  for (const result of roll.terms.filter((entry) => !isPrecision(entry.term))) {
    addTerm(pools, result);
  }
  const precisionTerms = roll.terms.filter((result) => isPrecision(result.term));
  const precision = RollTotal.parse(precisionTerms.reduce((total, result) => total + result.value, 0));
  const index = pools.findIndex((entry) => !entry.persistent);
  const base = pools[index];
  if (base !== undefined) {
    pools.splice(index, 1, { ...base, precision });
  } else if (precisionTerms.length > 0) {
    pools.push({ type: DamageType.Precision, persistent: false, rolled: precision, precision: ZERO, splash: ZERO });
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
  /** The precision share as dealt, doubled with the rest. */
  readonly precision: DamageTotal;
}

function doubleIf(amount: DamageTotal, doubling: Doubling): DamageTotal {
  return DamageTotal.parse(doubling === Doubling.Doubled ? amount * CRITICAL_MULTIPLIER : amount);
}

function criticalLine(rolled: DamageTotal, doubled: DamageTotal, doubling: Doubling): MessageDescriptor | undefined {
  if (rolled === 0 || doubling === Doubling.None) {
    return undefined;
  }
  return doubling === Doubling.Doubled
    ? message(DiceMessage.DamageCritical, { rolled, doubled })
    : message(DiceMessage.DamageCriticalImmune);
}

function dealt(pooled: Pooled, doubling: Doubling): Dealt {
  const base = DamageTotal.parse(Math.max(pooled.rolled, 0));
  const precision = DamageTotal.parse(Math.max(pooled.precision, 0));
  const splash = DamageTotal.parse(Math.max(pooled.splash, 0));
  const rolled = DamageTotal.parse(base + precision);
  const doubled = doubleIf(rolled, doubling);
  const lines = [
    criticalLine(rolled, doubled, doubling),
    splash > 0 ? message(DiceMessage.DamageSplash, { splash }) : undefined,
  ].filter((line) => line !== undefined);
  return { rolled, precision: doubleIf(precision, doubling), amount: DamageTotal.parse(doubled + splash), lines };
}

/** Whether a weakness or resistance naming `target` applies to an instance made of `types` (none: untyped). */
function covers(target: DamageAdjustmentTarget, types: readonly DamageType[]): boolean {
  if (target === DamageGroup.All) {
    return true;
  }
  if (target === DamageGroup.Physical || target === DamageGroup.Energy) {
    const group = DAMAGE_GROUP_TYPES[target];
    return types.some((type) => group.includes(type));
  }
  return types.includes(target);
}

/** The highest of `adjustments` that applies: only one weakness or resistance counts per instance. */
function highest(adjustments: readonly DamageAdjustment[], types: readonly DamageType[]): DamageAdjustment | undefined {
  return adjustments
    .filter((adjustment) => covers(adjustment.type, types))
    .toSorted((left, right) => right.value - left.value)[0];
}

/** The highest applicable weakness adds its value once, if the instance deals any damage. */
function weaken(amount: DamageTotal, types: readonly DamageType[], target: DamageTarget): Applied {
  const weakness = amount > 0 ? highest(target.weaknesses, types) : undefined;
  if (weakness === undefined) {
    return { amount, lines: [] };
  }
  return {
    amount: DamageTotal.parse(amount + weakness.value),
    lines: [message(DiceMessage.DamageWeakness, { value: weakness.value, target: weakness.type })],
  };
}

/** The highest applicable resistance removes up to its value. */
function resist(amount: DamageTotal, types: readonly DamageType[], target: DamageTarget): Applied {
  const resistance = amount > 0 ? highest(target.resistances, types) : undefined;
  if (resistance === undefined) {
    return { amount, lines: [] };
  }
  const prevented = Math.min(resistance.value, amount);
  return {
    amount: DamageTotal.parse(amount - prevented),
    lines: [message(DiceMessage.DamageResistance, { value: resistance.value, target: resistance.type, prevented })],
  };
}

/** What immunities leave of an instance: nothing if immune to its type, less its precision share if immune to precision. */
function immunise(pooled: Pooled, dealtNow: Dealt, target: DamageTarget): Applied {
  if (pooled.type !== undefined && target.immunities.includes(Immunity.parse(pooled.type))) {
    const prevented = dealtNow.amount;
    return { amount: NONE, lines: [message(DiceMessage.DamageImmune, { type: pooled.type, prevented })] };
  }
  if (dealtNow.precision > 0 && target.immunities.includes(PRECISION)) {
    const prevented = dealtNow.precision;
    return {
      amount: DamageTotal.parse(dealtNow.amount - prevented),
      lines: [message(DiceMessage.DamageImmune, { type: DamageType.Precision, prevented })],
    };
  }
  return { amount: dealtNow.amount, lines: [] };
}

/** The damage types an instance counts as for weakness and resistance once immunities have applied. */
function typesOf(pooled: Pooled, precisionLeft: boolean): readonly DamageType[] {
  const own = pooled.type === undefined ? [] : [pooled.type];
  return precisionLeft ? [...own, DamageType.Precision] : own;
}

/** Deals one instance, then immunities, the highest weakness and the highest resistance adjust it. */
function deal(pooled: Pooled, target: DamageTarget, doubling: Doubling): DamageInstance {
  const dealtNow = dealt(pooled, doubling);
  const type = pooled.type === undefined ? {} : { type: pooled.type };
  const immune = immunise(pooled, dealtNow, target);
  const types = typesOf(pooled, dealtNow.precision > 0 && !target.immunities.includes(PRECISION));
  const weakened = weaken(immune.amount, types, target);
  const resisted = resist(weakened.amount, types, target);
  return {
    ...type,
    rolled: dealtNow.rolled,
    dealt: dealtNow.amount,
    taken: resisted.amount,
    lines: [...dealtNow.lines, ...immune.lines, ...weakened.lines, ...resisted.lines],
  };
}

function sum(instances: readonly DamageInstance[]): DamageTotal {
  let total = 0;
  for (const instance of instances) {
    total += instance.taken;
  }
  return DamageTotal.parse(total);
}

function doublingFor(critical: boolean, target: DamageTarget): Doubling {
  if (!critical) {
    return Doubling.None;
  }
  return target.immunities.includes(CRITICAL_HITS) ? Doubling.Immune : Doubling.Doubled;
}

/**
 * Applies a damage roll to `target`. Terms are pooled into one instance per damage type (untagged
 * terms are untyped), persistent damage apart from the rest, splash joins the immediate damage of its
 * type, and precision joins the first immediate instance. Each instance is doubled on a critical (the
 * remaster default, doubling the total) unless the target is immune to critical hits, then
 * immunities, weaknesses and resistances apply in that order.
 */
export function applyDamage(
  roll: RollResult,
  target: DamageTarget,
  { critical }: DamageOptions = NOT_CRITICAL,
): DamageApplication {
  const pools = pool(roll);
  const doubling = doublingFor(critical, target);
  const immediate = pools.filter((pooled) => !pooled.persistent).map((pooled) => deal(pooled, target, doubling));
  const persistent = pools.filter((pooled) => pooled.persistent).map((pooled) => deal(pooled, target, doubling));
  return { critical, immediate, persistent, taken: sum(immediate), persistentTaken: sum(persistent) };
}
