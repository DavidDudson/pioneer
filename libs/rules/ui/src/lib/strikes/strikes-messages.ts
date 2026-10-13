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
} as const;
