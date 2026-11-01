import { DAMAGE_GROUP_TYPES, DamageAdjustmentTarget, DamageContext, DamageGroup, DamageType } from '@pioneer/rules/sdk';
import type { DamageAdjustment, DamageAdjustmentSubject, DamageException, DamageTarget } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

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

const TARGETS: ReadonlySet<string> = new Set(Object.values(DamageAdjustmentTarget));

/** Whether `subject` is a damage type, group or source, and not a material or property rune the damage counts as. */
function isTarget(subject: DamageAdjustmentSubject): subject is DamageAdjustmentTarget {
  return TARGETS.has(subject);
}

const CONTEXTS: ReadonlySet<string> = new Set(Object.values(DamageContext));

/** Whether `target` is a source (area, splash, spell) and not a damage type or group. */
function isContext(target: DamageAdjustmentTarget): target is DamageContext {
  return CONTEXTS.has(target);
}

/** Whether `target` is a damage group, which covers the types in it. */
function isGroup(target: DamageAdjustmentTarget): target is DamageGroup {
  return Object.values<string>(DamageGroup).includes(target);
}

/** Whether `source` is of the kind `context` names: an area effect, splash damage or a spell. */
function inContext(context: DamageContext, source: Source): boolean {
  if (context === DamageContext.AreaDamage) {
    return source.area;
  }
  return context === DamageContext.SplashDamage ? source.splash : source.spell;
}

/** Whether any of `types` is in `group`; `all` covers every instance. */
function inGroup(group: DamageGroup, types: readonly DamageType[]): boolean {
  if (group === DamageGroup.All) {
    return true;
  }
  return types.some((type) => DAMAGE_GROUP_TYPES[group].includes(type));
}

/**
 * Whether a weakness or resistance naming `target` applies to an instance made of `types` (none: untyped) from
 * `source`. A weakness to splash damage applies to an instance that has any splash, once, as it does for a type.
 */
function covers(target: DamageAdjustmentSubject, types: readonly DamageType[], source: Source): boolean {
  if (!isTarget(target)) {
    return source.counts.includes(target);
  }
  if (isContext(target)) {
    return inContext(target, source);
  }
  return isGroup(target) ? inGroup(target, types) : types.includes(target);
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

type DiceKey = ValueOf<typeof DiceMessage>;

/** The message keys that say what an adjustment did: one for a target, one for a material it names. */
interface AdjustmentKeys {
  readonly target: DiceKey;
  readonly material: DiceKey;
}

/** The line for `adjustment` having done something: it names its target, or the material (`cold iron`) it is to. */
function lineOf(
  keys: AdjustmentKeys,
  { type, value }: DamageAdjustment,
  extra: { readonly prevented?: DamageTotal } = {},
): MessageDescriptor {
  return isTarget(type)
    ? message(keys.target, { value, target: nameOf(type), ...extra })
    : message(keys.material, { value, material: type.replaceAll('-', ' '), ...extra });
}

const WEAKNESS_KEYS: AdjustmentKeys = {
  target: DiceMessage.DamageWeakness,
  material: DiceMessage.DamageWeaknessMaterial,
};
const RESISTANCE_KEYS: AdjustmentKeys = {
  target: DiceMessage.DamageResistance,
  material: DiceMessage.DamageResistanceMaterial,
};

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
    lines: [lineOf(WEAKNESS_KEYS, weakness)],
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
    lines: [lineOf(RESISTANCE_KEYS, resistance, { prevented })],
  };
}
