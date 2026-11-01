import { DAMAGE_GROUP_TYPES, DamageContext, DamageGroup, DamageType } from '@pioneer/rules/sdk';
import type { DamageAdjustment, DamageAdjustmentTarget, DamageException, DamageTarget } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { DiceMessage } from './messages';
import { DamageTotal } from './units';

/** Damage after one rule, and the line saying what the rule did (none when it did nothing). */
export interface Applied {
  readonly amount: DamageTotal;
  readonly lines: readonly MessageDescriptor[];
}

/** Where an instance came from: an area effect, a spell, and whether it has splash. */
export interface Source {
  readonly area: boolean;
  readonly splash: boolean;
  /** The damage is from a spell. */
  readonly spell: boolean;
  /** The materials and property runes the damage counts as (`silver`, `ghost-touch`), which an exception names. */
  readonly counts: readonly DamageException[];
}

/**
 * Whether a weakness or resistance naming `target` applies to an instance made of `types` (none: untyped) from
 * `source`. A weakness to splash damage applies to an instance that has any splash, once, as it does for a type.
 */
function covers(target: DamageAdjustmentTarget, types: readonly DamageType[], source: Source): boolean {
  if (target === DamageGroup.All) {
    return true;
  }
  if (target === DamageContext.AreaDamage) {
    return source.area;
  }
  if (target === DamageContext.SplashDamage) {
    return source.splash;
  }
  if (target === DamageContext.Spells) {
    return source.spell;
  }
  if (target === DamageGroup.Physical || target === DamageGroup.Energy) {
    const group = DAMAGE_GROUP_TYPES[target];
    return types.some((type) => group.includes(type));
  }
  return types.includes(target);
}

/** What a damage message calls a target: the target, or a source in camel case. */
type MessageTarget = Exclude<DamageAdjustmentTarget, DamageContext> | 'areaDamage' | 'splashDamage' | 'spells';

/** A target as a message names it: ICU select keys can't hold a hyphen, so a source is in camel case. */
function nameOf(target: DamageAdjustmentTarget): MessageTarget {
  if (target === DamageContext.AreaDamage) {
    return 'areaDamage';
  }
  if (target === DamageContext.SplashDamage) {
    return 'splashDamage';
  }
  return target === DamageContext.Spells ? 'spells' : target;
}

/** Whether the source counts as one of the adjustment's exceptions (`resistance 5 physical except silver`), so it does not apply. */
function excepted({ exceptions = [] }: DamageAdjustment, { counts }: Source): boolean {
  return exceptions.some((exception) => counts.includes(exception));
}

/** The highest of `adjustments` that applies: only one weakness or resistance counts per instance. */
function highest(
  adjustments: readonly DamageAdjustment[],
  types: readonly DamageType[],
  source: Source,
): DamageAdjustment | undefined {
  return adjustments
    .filter((adjustment) => covers(adjustment.type, types, source) && !excepted(adjustment, source))
    .toSorted((left, right) => right.value - left.value)[0];
}

/** The highest applicable weakness adds its value once, if the instance deals any damage. */
export function weaken(amount: DamageTotal, { types, source }: Reach, target: DamageTarget): Applied {
  const weakness = amount > 0 ? highest(target.weaknesses, types, source) : undefined;
  if (weakness === undefined) {
    return { amount, lines: [] };
  }
  return {
    amount: DamageTotal.parse(amount + weakness.value),
    lines: [message(DiceMessage.DamageWeakness, { value: weakness.value, target: nameOf(weakness.type) })],
  };
}

interface Reach {
  readonly types: readonly DamageType[];
  readonly source: Source;
}

/** What a resistance can reach in an instance: the types it counts as, where it came from, and its precision share. */
export interface Exposure extends Reach {
  /** The precision share; resistance to precision stops no more than this, as in Foundry. */
  readonly precision: DamageTotal;
}

/** How much `resistance` would stop of `amount`. */
function preventing(resistance: DamageAdjustment, amount: DamageTotal, exposure: Exposure): DamageTotal {
  const reach = resistance.type === DamageType.Precision ? exposure.precision : amount;
  return DamageTotal.parse(Math.min(resistance.value, amount, reach));
}

/** The applicable resistance that stops the most removes up to its value. */
export function resist(amount: DamageTotal, exposure: Exposure, target: DamageTarget): Applied {
  const resistance =
    amount > 0
      ? target.resistances
          .filter(
            (candidate) =>
              covers(candidate.type, exposure.types, exposure.source) && !excepted(candidate, exposure.source),
          )
          .toSorted((left, right) => preventing(right, amount, exposure) - preventing(left, amount, exposure))[0]
      : undefined;
  if (resistance === undefined) {
    return { amount, lines: [] };
  }
  const prevented = preventing(resistance, amount, exposure);
  return {
    amount: DamageTotal.parse(amount - prevented),
    lines: [
      message(DiceMessage.DamageResistance, { value: resistance.value, target: nameOf(resistance.type), prevented }),
    ],
  };
}
