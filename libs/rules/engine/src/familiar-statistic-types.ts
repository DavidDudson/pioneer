import type { CompanionMovements, CompanionSkill, Feet, HitPoints, Level, Modifier, Size } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { CompanionStatistic } from './companion-statistic-types';

/**
 * The familiar abilities that change a statistic: the Pet feat's abilities, which a familiar can choose as familiar
 * abilities (Player Core pg. 212, pg. 259). Which content entry is which ability is the caller's to map.
 */
export const FamiliarAbility = {
  Amphibious: 'amphibious',
  Burrower: 'burrower',
  Climber: 'climber',
  Darkvision: 'darkvision',
  Echolocation: 'echolocation',
  FastMovement: 'fast-movement',
  Flier: 'flier',
  ManualDexterity: 'manual-dexterity',
  Scent: 'scent',
  Tough: 'tough',
} as const;

export type FamiliarAbility = ValueOf<typeof FamiliarAbility>;

/** A way a familiar perceives, beside its low-light vision. */
export const FamiliarSense = {
  LowLightVision: 'low-light-vision',
  Darkvision: 'darkvision',
  /** Hearing as a precise sense within 20 feet. */
  Echolocation: 'echolocation',
  /** Scent as an imprecise sense within 30 feet. */
  Scent: 'scent',
} as const;

export type FamiliarSense = ValueOf<typeof FamiliarSense>;

/** What a familiar's land Speed is called: its other Speeds are the companion movements. */
export const FamiliarSpeed = {
  Land: 'land',
  Burrow: 'burrow',
  Climb: 'climb',
  Fly: 'fly',
  Swim: 'swim',
} as const;

export type FamiliarSpeed = ValueOf<typeof FamiliarSpeed>;

/** The saves of a master, as its sheet totals them before any circumstance or status bonus or penalty. */
export interface MasterSaves {
  readonly fortitude: Modifier;
  readonly reflex: Modifier;
  readonly will: Modifier;
}

/** What a familiar's statistics derive from: its master's level, defences and spellcasting, and the abilities chosen today. */
export interface FamiliarInputs {
  readonly level: Level;
  /** The master's AC before circumstance or status bonuses or penalties. */
  readonly armorClass: Modifier;
  readonly saves: MasterSaves;
  /** The master's spellcasting attribute modifier; none when the master casts no spells. */
  readonly spellcasting: Modifier | undefined;
  /** The abilities chosen today that change a statistic. */
  readonly abilities: ReadonlySet<FamiliarAbility>;
  /** The skills the Skilled ability was taken for. */
  readonly skilled: ReadonlySet<CompanionSkill>;
  /** An aquatic familiar breathes water and has a swim Speed instead of a land Speed. */
  readonly aquatic: boolean;
  /** The Speed Fast Movement raises to 40 feet; the familiar's main Speed when not said. */
  readonly fastMovesOn?: FamiliarSpeed;
}

/** A familiar's derived statistics: each total with the lines that add up to it. */
export interface FamiliarStatistics {
  readonly level: Level;
  readonly size: Size;
  readonly hitPoints: { readonly total: HitPoints; readonly lines: CompanionStatistic['lines'] };
  readonly armorClass: CompanionStatistic;
  readonly fortitude: CompanionStatistic;
  readonly reflex: CompanionStatistic;
  readonly will: CompanionStatistic;
  readonly perception: CompanionStatistic;
  readonly acrobatics: CompanionStatistic;
  readonly stealth: CompanionStatistic;
  /** The skills the Skilled ability was taken for. */
  readonly skilled: Readonly<Partial<Record<CompanionSkill, CompanionStatistic>>>;
  /** Any other skill: the familiar's level alone. */
  readonly otherSkills: CompanionStatistic;
  /** The land Speed; none for an aquatic familiar. */
  readonly speed: Feet | undefined;
  /** Its other Speeds. */
  readonly movement: CompanionMovements;
  readonly senses: ReadonlyArray<FamiliarSense>;
}
