import { CriticalDurationType, DamageDiceCategory, DegreeOfSuccess } from '@pioneer/rules/sdk';

/** Message keys the Strikes list renders with, spelled out so the key check sees them. */
export const StrikesMessage = {
  /** "1d8+4 slashing": a Strike's damage, its roll worded by the list and its type by name. */
  Damage: 'rules.strikes.damage',
  /** "Multiple attack penalty −5 / −10": what the second and third attack of a turn take. */
  MultipleAttackPenalty: 'rules.strikes.multipleAttackPenalty',
  /** The heading over the breakdown of a Strike's attack roll. */
  AttackHeading: 'rules.strikes.attackHeading',
  /** The heading over the breakdown of the flat damage a Strike adds. */
  DamageHeading: 'rules.strikes.damageHeading',
  /** A Strike with no damage to roll (a glue bomb). */
  NoDamage: 'rules.strikes.noDamage',
  /** "Attack +9 / +4 / -1": the attack modifier at the first, second and third attack of a turn. */
  Attacks: 'rules.strikes.attacks',
  /** "Next attack: +4": the modifier of the attack that comes next this turn, after the ones made. */
  NextAttack: 'rules.strikes.nextAttack',
  /** "Steel Shield: Hardness 5, HP 20, Broken Threshold 10": a held shield beside the Strikes. */
  Shield: 'rules.strikes.shield',
  /** "Avatar of Iomedae: Hardness 15, can't be damaged": the shield a battle form carries. */
  ShieldUndamageable: 'rules.strikes.shieldUndamageable',
  /** "1d6 persistent fire": a bomb's persistent damage beside its damage. */
  Persistent: 'rules.strikes.persistent',
  /** "Extra damage when its condition holds (Vitalizing)": a rule element that changes the damage once the roll claims its situation. */
  DamageCondition: 'rules.strikes.damageCondition',
  /** "1 fire splash": a bomb's splash damage. */
  Splash: 'rules.strikes.splash',
  /** "Range increment 20 ft": how far a ranged or thrown Strike reaches before each penalty. */
  RangeIncrement: 'rules.strikes.rangeIncrement',
  /** "Reach 60 ft": how far a melee Strike reaches when a rule element lengthens it (an extending rune). */
  Reach: 'rules.strikes.reach',
  /** "Made of cold iron": the precious materials an item alteration gives a weapon. */
  Materials: 'rules.strikes.materials',
  /** "Property runes: flaming": the runes an item alteration gives a weapon. */
  PropertyRunes: 'rules.strikes.propertyRunes',
  /** "3 in stack": how many of a thrown item the stack still holds. */
  Quantity: 'rules.strikes.quantity',
  /** "Plus 1d6 fire precision": dice a damage element adds to a Strike's damage. */
  ExtraDice: 'rules.strikes.extraDice',
  /** "On a critical hit, the target gains weakness 5 to fire until the end of your next turn": what an energy vulnerability rune does. */
  CriticalWeakness: 'rules.strikes.criticalWeakness',
  /** "Keen: a natural 19 on the attack is a critical hit, as long as it succeeds". */
  CriticalRange: 'rules.strikes.criticalRange',
  /** "Replaced by your form: Longsword, Dagger. The base sheet lists them.": the weapon Strikes a form replaces. */
  Suppressed: 'rules.strikes.suppressed',
  /** "On a critical success": the degrees of success a note shows on. */
  NoteOutcome: 'rules.strikes.noteOutcome',
} as const;

/** The message of each way extra damage dice are dealt besides their type, spelled out so the key check sees them. */
export const DAMAGE_CATEGORY_MESSAGES: Readonly<Record<DamageDiceCategory, string>> = {
  [DamageDiceCategory.Precision]: 'rules.strikes.category.precision',
  [DamageDiceCategory.Persistent]: 'rules.strikes.category.persistent',
  [DamageDiceCategory.Splash]: 'rules.strikes.category.splash',
};

/** The message of each degree of success a note can show on. */
export const NOTE_DEGREE_MESSAGES: Readonly<Record<DegreeOfSuccess, string>> = {
  [DegreeOfSuccess.CriticalSuccess]: 'rules.strikes.degree.criticalSuccess',
  [DegreeOfSuccess.Success]: 'rules.strikes.degree.success',
  [DegreeOfSuccess.Failure]: 'rules.strikes.degree.failure',
  [DegreeOfSuccess.CriticalFailure]: 'rules.strikes.degree.criticalFailure',
};

/** Message parameters for flags, as the `yes`/`no` a `select` reads. */
export function yesNo(flags: Readonly<Record<string, boolean>>): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(flags).map(([name, flag]) => [name, flag ? 'yes' : 'no']));
}

/** The lines for what a critical hit does besides its damage, spelled out so the key check sees them. */
export const CriticalEffectMessage = {
  /** "Frost: on a critical hit, the target is Slowed 1 until the end of your next turn, unless it succeeds at a DC 24 Fortitude save". */
  Condition: 'rules.strikes.criticalEffect.condition',
  /** "Shock: on a critical hit, equal electricity damage to up to 2 other creatures within 10 ft of the target". */
  DamageOthers: 'rules.strikes.criticalEffect.damageOthers',
  /** "Corrosive: on a critical hit, the target's armor, or its raised shield, takes 3d6 acid damage, before Hardness". */
  DamageArmor: 'rules.strikes.criticalEffect.damageArmor',
  /** "equal": the damage as much as the Strike dealt. */
  EqualDamage: 'rules.strikes.criticalEffect.equalDamage',
} as const;

/** How long a condition from a critical hit lasts, by kind of duration. */
export const CRITICAL_DURATION_MESSAGES = {
  [CriticalDurationType.NextTurnEnd]: 'rules.strikes.criticalEffect.duration.nextTurnEnd',
  [CriticalDurationType.Time]: 'rules.strikes.criticalEffect.duration.time',
  [CriticalDurationType.Permanent]: 'rules.strikes.criticalEffect.duration.permanent',
} as const;
