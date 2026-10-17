import { DamageType, DiceCount, Modifier, ModifierTarget, Selector, Trait } from '@pioneer/rules/sdk';
import type { DamageAmount, DieSize, PersistentDamage, Slug } from '@pioneer/rules/sdk';

import { strikesUnderForm } from './battle-form-strikes';
import type { ModifierInputs } from './rule-in-play';
import type { WeaponInputs } from './source-inputs';
import type { StatisticResult } from './statistic-result';
import { strikeRules } from './strike-rules';
import type { ExtraDice, StrikeNote, StrikeRules, StrikeScope } from './strike-rules';

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
  /** Dice that `DamageDice` elements add on top of the weapon's, each with its type and category. */
  readonly extra: readonly ExtraDice[];
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
  /** The `Note` elements that reach the attack or damage roll. */
  readonly notes: readonly StrikeNote[];
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

/** The rule elements in play and what they are read against, so a Strike takes the dice and notes they give. */
export interface StrikeRulesInput {
  readonly inputs: ModifierInputs;
  readonly scope: StrikeScope;
}

/** The selectors and domains of a weapon's attack roll, as Foundry names them. */
function attackTargets(slug: Slug): ReadonlySet<ModifierTarget> {
  return new Set(
    [`${ATTACK}:${slug}`, ATTACK, `${slug}-attack`, 'attack', 'attack-roll', 'strike-attack-roll'].map((target) =>
      ModifierTarget.parse(target),
    ),
  );
}

/** The selectors and domains of a weapon's damage roll, as Foundry names them. */
function damageTargets(slug: Slug): ReadonlySet<ModifierTarget> {
  return new Set(
    [`${DAMAGE}:${slug}`, DAMAGE, `${slug}-damage`, 'damage'].map((target) => ModifierTarget.parse(target)),
  );
}

/** What the rule elements in play change about the weapon's Strike: its dice, extra dice and notes. */
function rulesOf(weapon: WeaponInputs, rules: StrikeRulesInput | undefined): StrikeRules | undefined {
  if (rules === undefined) {
    return undefined;
  }
  const { damage } = weapon;
  return strikeRules(rules.inputs, rules.scope, {
    dice: damageDice(weapon) ?? DiceCount.parse(0),
    die: damage?.die,
    damageType: damage?.damageType ?? DamageType.Bludgeoning,
    attack: attackTargets(weapon.slug),
    damage: damageTargets(weapon.slug),
  });
}

function damageOf(
  weapon: WeaponInputs,
  results: ReadonlyMap<Selector, StatisticResult>,
  changes: StrikeRules | undefined,
): StrikeDamage | undefined {
  const dice = damageDice(weapon);
  if (dice === undefined || weapon.damage === undefined) {
    return undefined;
  }
  const { die, damageType, persistent } = weapon.damage;
  return {
    dice: changes?.dice ?? dice,
    die,
    damageType: changes?.damageType ?? damageType,
    extra: changes?.extra ?? [],
    persistent,
    splash: weapon.splash,
    bonus: results.get(Selector.parse(`${DAMAGE}:${weapon.slug}`)),
  };
}

/**
 * Each weapon's Strike (rules-engine.md, step 7), in the weapons' order: the attack and flat damage statistics
 * `deriveStatistics` made for it, its dice and its multiple attack penalty. With `rules`, the dice and notes that
 * `DamageDice`, `DamageAlteration` and `Note` elements in play give (`strikeRules`). A battle form in force replaces the weapons' Strikes with its own (`strikesUnderForm`).
 */
export function deriveStrikes(
  derivedWeapons: readonly WeaponInputs[],
  derivedResults: ReadonlyMap<Selector, StatisticResult>,
  rules?: StrikeRulesInput,
): readonly Strike[] {
  const { weapons, results } =
    rules === undefined
      ? { weapons: derivedWeapons, results: derivedResults }
      : strikesUnderForm({ weapons: derivedWeapons, results: derivedResults }, rules);
  return weapons.map((weapon): Strike => {
    const changes = rulesOf(weapon, rules);
    return {
      weapon,
      attack: results.get(Selector.parse(`${ATTACK}:${weapon.slug}`)),
      damage: damageOf(weapon, results, changes),
      notes: changes?.notes ?? [],
      map: multipleAttackPenalty(weapon),
    };
  });
}
