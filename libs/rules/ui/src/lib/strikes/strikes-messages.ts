import { DamageDiceCategory, DegreeOfSuccess } from '@pioneer/rules/sdk';

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
  /** "Steel Shield: Hardness 5, HP 20, Broken Threshold 10": a held shield beside the Strikes. */
  Shield: 'rules.strikes.shield',
  /** "1d6 persistent fire": a bomb's persistent damage beside its damage. */
  Persistent: 'rules.strikes.persistent',
  /** "1 fire splash": a bomb's splash damage. */
  Splash: 'rules.strikes.splash',
  /** "Range increment 20 ft": how far a ranged or thrown Strike reaches before each penalty. */
  RangeIncrement: 'rules.strikes.rangeIncrement',
  /** "Made of cold iron": the precious materials an item alteration gives a weapon. */
  Materials: 'rules.strikes.materials',
  /** "Property runes: flaming": the runes an item alteration gives a weapon. */
  PropertyRunes: 'rules.strikes.propertyRunes',
  /** "3 in stack": how many of a thrown item the stack still holds. */
  Quantity: 'rules.strikes.quantity',
  /** "Plus 1d6 fire precision": dice a damage element adds to a Strike's damage. */
  ExtraDice: 'rules.strikes.extraDice',
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
