import { DiceCount, Modifier, Selector, Trait } from '@pioneer/rules/sdk';
import type { DamageAmount, DamageType, DieSize, PersistentDamage } from '@pioneer/rules/sdk';

import type { WeaponInputs } from './source-inputs';
import type { StatisticResult } from './statistic-result';

/** The family each weapon's attack roll is derived under: `strike:<weapon slug>`. */
const ATTACK = 'strike';

/** The family each weapon's flat damage is derived under: `strike-damage:<weapon slug>`. */
const DAMAGE = 'strike-damage';

/**
 * A Strike's damage before its roll: the dice its weapon rolls (a striking rune adds more), their type, and the flat
 * bonus the weapon's `strike-damage` statistic gives, with its breakdown. A weapon with no die does flat damage:
 * `dice` is that amount and `die` is absent (a blowgun's 1 piercing).
 */
export interface StrikeDamage {
  readonly dice: DiceCount;
  readonly die: DieSize | undefined;
  readonly damageType: DamageType;
  /** A bomb's persistent damage ("1d6 fire"), which neither the flat bonus nor a striking rune changes. */
  readonly persistent: PersistentDamage | undefined;
  /** A bomb's splash damage, of the damage's type, dealt to creatures near its target; no bonus adds to it. */
  readonly splash: DamageAmount | undefined;
  /** The `strike-damage:<slug>` statistic: Strength and whatever else adds to damage. Undefined if not derived. */
  readonly bonus: StatisticResult | undefined;
}

/** The multiple attack penalty on a second and a third attack in a turn, as modifiers (-5 and -10; -4 and -8 agile). */
export interface MultipleAttackPenalty {
  readonly second: Modifier;
  readonly third: Modifier;
}

/** One Strike: its weapon, its attack roll, its damage and its multiple attack penalty. */
export interface Strike {
  readonly weapon: WeaponInputs;
  /** The `strike:<slug>` statistic; undefined when the definition is not in the registry. */
  readonly attack: StatisticResult | undefined;
  /** Undefined for a weapon that does no damage (a glue bomb). */
  readonly damage: StrikeDamage | undefined;
  readonly map: MultipleAttackPenalty;
}

const AGILE = Trait.parse('agile');

const NORMAL_SECOND = Modifier.parse(-5);
const NORMAL_THIRD = Modifier.parse(-10);
const AGILE_SECOND = Modifier.parse(-4);
const AGILE_THIRD = Modifier.parse(-8);

const NORMAL_MAP: MultipleAttackPenalty = { second: NORMAL_SECOND, third: NORMAL_THIRD };
const AGILE_MAP: MultipleAttackPenalty = { second: AGILE_SECOND, third: AGILE_THIRD };

/** The penalty a weapon's later attacks take: -5 and -10, or -4 and -8 for an agile weapon (Player Core). */
export function multipleAttackPenalty(weapon: WeaponInputs): MultipleAttackPenalty {
  return weapon.traits.includes(AGILE) ? AGILE_MAP : NORMAL_MAP;
}

/** The dice a weapon rolls: its own, and a striking rune's grade more when it rolls a die at all. */
export function damageDice(weapon: WeaponInputs): DiceCount | undefined {
  const { damage, striking = 0 } = weapon;
  if (damage === undefined || (damage.dice === 0 && damage.die === undefined)) {
    return undefined;
  }
  return DiceCount.parse(damage.die === undefined ? damage.dice : damage.dice + striking);
}

function damageOf(weapon: WeaponInputs, results: ReadonlyMap<Selector, StatisticResult>): StrikeDamage | undefined {
  const dice = damageDice(weapon);
  if (dice === undefined || weapon.damage === undefined) {
    return undefined;
  }
  const { die, damageType, persistent } = weapon.damage;
  return {
    dice,
    die,
    damageType,
    persistent,
    splash: weapon.splash,
    bonus: results.get(Selector.parse(`${DAMAGE}:${weapon.slug}`)),
  };
}

/**
 * Each weapon's Strike (rules-engine.md, step 7), in the weapons' order: the attack and flat damage statistics
 * `deriveStatistics` made for it, its dice and its multiple attack penalty.
 */
export function deriveStrikes(
  weapons: readonly WeaponInputs[],
  results: ReadonlyMap<Selector, StatisticResult>,
): readonly Strike[] {
  return weapons.map((weapon): Strike => ({
    weapon,
    attack: results.get(Selector.parse(`${ATTACK}:${weapon.slug}`)),
    damage: damageOf(weapon, results),
    map: multipleAttackPenalty(weapon),
  }));
}
